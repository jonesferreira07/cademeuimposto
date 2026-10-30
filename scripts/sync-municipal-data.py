"""Atualiza a fotografia municipal IBGE/TSE; não comprova exercício atual.
Uso: python3 scripts/sync-municipal-data.py --as-of 2026-10-30
Downloads brutos ficam fora do repositório. Só nomes e identificadores públicos
necessários à consulta são publicados, sem CPF, título, nascimento ou e-mail.
"""
import argparse, collections, concurrent.futures, csv, datetime, gzip, hashlib, io, json, math, pathlib, subprocess, tempfile, unicodedata, urllib.request, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data/municipal'
CACHE = pathlib.Path(tempfile.gettempdir()) / 'cmi-municipal-sources'
TSE_URL = 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2024.zip'
IBGE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios'
STATES = {'11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO','21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR','42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'}
# Grafias distintas nas duas bases oficiais: correspondências explícitas,
# revisadas nominalmente. Nenhuma busca aproximada é feita pelo importador.
ALIASES = {
 ('RO','ESPIGÃO DO OESTE'): "Espigão D'Oeste", ('RO','ALVORADA DO OESTE'): "Alvorada D'Oeste",
 ('RR','SÃO LUIZ'): 'São Luiz do Anauá', ('PA','ELDORADO DOS CARAJÁS'): 'Eldorado do Carajás',
 ('PA','SANTA ISABEL DO PARÁ'): 'Santa Izabel do Pará', ('RN','BOA SAÚDE'): 'Januário Cicco',
 ('SE','AMPARO DE SÃO FRANCISCO'): 'Amparo do São Francisco', ('BA','CAMACÃ'): 'Camacan',
 ('MG','BARÃO DE MONTE ALTO'): 'Barão do Monte Alto', ('MG','DONA EUSÉBIA'): 'Dona Euzébia',
 ('MG','SÃO THOMÉ DAS LETRAS'): 'São Tomé das Letras', ('SP','SÃO LUÍS DO PARAITINGA'): 'São Luiz do Paraitinga',
 ('MT','SANTO ANTÔNIO DO LEVERGER'): 'Santo Antônio de Leverger',
}
ELECTED = {'ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA'}
def normal(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.upper()) if not unicodedata.combining(c) and c.isalnum())
def fetch(url, name):
    path = CACHE / name
    if not path.exists():
        with urllib.request.urlopen(url, timeout=120) as response:
            raw = response.read(150_000_000)
        if raw[:2] == b'\x1f\x8b': raw = gzip.decompress(raw)
        path.write_bytes(raw)
    return path.read_bytes()
def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')
def geometry(geo, cities):
    features = geo['features']; points = []
    def polygons(feature):
        g = feature['geometry']
        if g['type'] not in ['Polygon', 'MultiPolygon']: raise ValueError('Geometria inesperada')
        return [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    for f in features:
        if str(f['properties']['codarea']) in cities:
            points.extend(p for poly in polygons(f) for ring in poly for p in ring)
    if not points: raise ValueError('Malha vazia')
    correction = math.cos(math.radians(sum(p[1] for p in points) / len(points)))
    raw = [(p[0] * correction, -p[1]) for p in points]
    minx, miny = min(p[0] for p in raw), min(p[1] for p in raw)
    dx, dy = max(p[0] for p in raw) - minx, max(p[1] for p in raw) - miny
    scale = min(560 / dx, 510 / dy)
    def project(p):
        return (round(20 + (560 - dx * scale) / 2 + (p[0] * correction - minx) * scale, 2), round(20 + (510 - dy * scale) / 2 + (-p[1] - miny) * scale, 2))
    seen = set()
    for f in features:
        code = str(f['properties']['codarea'])
        if code not in cities: continue  # corpos hídricos não são municípios
        if code in seen: raise ValueError('Geometria municipal duplicada')
        seen.add(code); parts = []; coords = []
        for poly in polygons(f):
            for ring in poly:
                projected = [project(p) for p in ring]; coords.extend(projected)
                parts.append(''.join(('M' if i == 0 else 'L') + str(x) + ',' + str(y) for i, (x,y) in enumerate(projected)) + 'Z')
        lo = [min(p[i] for p in coords) for i in [0,1]]
        hi = [max(p[i] for p in coords) for i in [0,1]]
        cities[code]['shape'] = {'d': ''.join(parts), 'bounds': [*lo, hi[0]-lo[0], hi[1]-lo[1]]}
    return sorted(set(cities) - seen)
def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--as-of', required=True); args = parser.parse_args()
    cutoff = datetime.date.fromisoformat(args.as_of).isoformat()
    CACHE.mkdir(exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
    # Reutiliza download já conferido nesta sessão, se presente.
    previous = pathlib.Path('/private/tmp/cmi-consulta-cand-2024.zip')
    target = CACHE / 'consulta_cand_2024.zip'
    if previous.exists() and not target.exists(): target.write_bytes(previous.read_bytes())
    raw = fetch(TSE_URL, 'consulta_cand_2024.zip'); archive = zipfile.ZipFile(io.BytesIO(raw))
    localities = json.loads(fetch(IBGE_URL, 'localities.json')); lookup = {}; byuf = {uf:{} for uf in STATES.values()}
    for row in localities:
        code = str(row['id']); uf = STATES[code[:2]]
        if code == '5300108': continue
        key = (uf, normal(row['nome']))
        if key in lookup: raise ValueError('Nome IBGE ambíguo')
        lookup[key] = code
        byuf[uf][code] = {'id':code, 'name':row['nome'], 'kind':'district' if code == '2605459' else 'municipality', 'tseCode':None, 'mayor':None, 'council':None}
    write(ROOT / 'src/data/municipal-index.json', sorted([{'id':c['id'],'name':c['name'],'uf':uf} for uf,cities in byuf.items() for c in cities.values() if c['kind']=='municipality'], key=lambda c:c['id']))
    groups = {}; aliases_used = {}; generations = collections.defaultdict(set)
    rows = csv.DictReader(io.TextIOWrapper(archive.open('consulta_cand_2024_BRASIL.csv'), encoding='latin1'), delimiter=';')
    for row in rows:
        if row['DS_CARGO'] not in ['PREFEITO','VEREADOR']: continue
        date = datetime.datetime.strptime(row['DT_ELEICAO'], '%d/%m/%Y').date().isoformat()
        if date > cutoff: continue
        uf, name = row['SG_UF'], row['NM_UE']
        alias = ALIASES.get((uf,name)); code = lookup.get((uf,normal(alias or name)))
        if code is None: raise ValueError('Município TSE não vinculado: ' + uf + ' ' + name)
        city = byuf[uf][code]
        if city['tseCode'] not in [None,row['SG_UE']]: raise ValueError('Mais de um código TSE por município')
        city['tseCode'] = row['SG_UE']
        if alias: aliases_used[code] = {'id':code,'uf':uf,'ibgeName':city['name'],'tseName':name,'tseCode':row['SG_UE']}
        generations[uf].add(row['DT_GERACAO'] + ' ' + row['HH_GERACAO'])
        role = 'mayor' if row['DS_CARGO'] == 'PREFEITO' else 'council'
        key = (uf,code,role); version = (date,int(row['NR_TURNO']))
        group = groups.setdefault(key, {'version':version,'electionId':row['CD_ELEICAO'],'supplementary':row['CD_TIPO_ELEICAO']=='1','people':{}})
        if version > group['version']:
            group = groups[key] = {'version':version,'electionId':row['CD_ELEICAO'],'supplementary':row['CD_TIPO_ELEICAO']=='1','people':{}}
        if version != group['version'] or row['DS_SIT_TOT_TURNO'] not in ELECTED: continue
        person = {'id':row['SQ_CANDIDATO'],'name':row['NM_CANDIDATO'],'ballotName':row['NM_URNA_CANDIDATO'],'party':row['SG_PARTIDO'],'status':row['DS_SIT_TOT_TURNO']}
        prior = group['people'].get(person['id'])
        if prior and prior != person: raise ValueError('Candidato duplicado divergente')
        group['people'][person['id']] = person
    for (uf,code,role), group in groups.items():
        people = sorted(group['people'].values(), key=lambda p: normal(p['ballotName']))
        if role == 'mayor' and len(people) > 1: raise ValueError('Mais de um prefeito eleito na mesma eleição')
        byuf[uf][code][role] = {'date':group['version'][0],'turn':group['version'][1],'electionId':group['electionId'],'supplementary':group['supplementary'],'people':people}
    def one(item):
        ibge, uf = item
        if uf == 'DF': return {'uf':uf,'localities':0,'geometries':0,'unconfirmedMayor':0,'unconfirmedCouncil':0,'missingGeometry':[]}
        url = f'https://servicodados.ibge.gov.br/api/v3/malhas/estados/{ibge}?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio'
        conversion = None
        if uf == 'MT':
            # A API simplificada ainda omite Boa Esperança do Norte. Substituímos
            # a malha inteira da UF, evitando sobrepor o novo limite a Sorriso.
            url = 'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/UFs/MT/MT_Municipios_2025.zip'
            geo_raw = fetch(url, 'MT_Municipios_2025.zip')
            converted = CACHE / 'mt-2025-simplified.json'
            if not converted.exists():
                mt_archive = zipfile.ZipFile(io.BytesIO(geo_raw))
                for extension in ['shp','shx','dbf','prj','cpg']:
                    filename = 'MT_Municipios_2025.' + extension
                    (CACHE / filename).write_bytes(mt_archive.read(filename))
                subprocess.run(['pnpm','dlx','mapshaper@0.7.101',str(CACHE / 'MT_Municipios_2025.shp'),'-simplify','2%','keep-shapes','-rename-fields','codarea=CD_MUN','-filter-fields','codarea','-o','format=geojson',str(converted)],check=True)
            geo = json.loads(converted.read_text())
            conversion = 'Malha IBGE 2025; Mapshaper 0.7.101, simplificação topológica 2%, keep-shapes.'
        else:
            geo_raw = fetch(url, uf.lower() + '-geometry.json')
            geo = json.loads(geo_raw)
        cities = byuf[uf]; missing = geometry(geo,cities)
        data = {'uf':uf,'asOf':cutoff,'tseGeneratedAt':sorted(generations[uf]),'sources':{'localities':IBGE_URL,'geometry':url,'election':'https://dadosabertos.tse.jus.br/dataset/candidatos-2024'},'cities':sorted(cities.values(),key=lambda c: normal(c['name']))}
        write(OUT / (uf.lower()+'.json'), data)
        return {'uf':uf,'localities':len(cities),'geometries':len(cities)-len(missing),'missingGeometry':missing,'unconfirmedMayor':sum(c['kind']=='municipality' and not (c['mayor'] or {}).get('people') for c in cities.values()),'unconfirmedCouncil':sum(c['kind']=='municipality' and not (c['council'] or {}).get('people') for c in cities.values()),'geometrySha256':hashlib.sha256(geo_raw).hexdigest(),'conversion':conversion}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: report = list(pool.map(one, STATES.items()))
    manifest = {'asOf':cutoff,'tseUrl':TSE_URL,'tseZipSha256':hashlib.sha256(raw).hexdigest(),'localitiesSource':IBGE_URL,'matching':'Nome normalizado exato dentro da UF; divergências nominais revisadas e registradas abaixo, sem aproximação automática.','aliases':sorted(aliases_used.values(),key=lambda a:a['id']),'states':report}
    write(OUT / 'manifest.json',manifest)
    print(json.dumps({'asOf':cutoff,'localities':sum(r['localities'] for r in report),'unconfirmedMayor':sum(r['unconfirmedMayor'] for r in report),'unconfirmedCouncil':sum(r['unconfirmedCouncil'] for r in report),'missingGeometry':[(r['uf'],r['missingGeometry']) for r in report if r['missingGeometry']]},ensure_ascii=False))
if __name__ == '__main__': main()
