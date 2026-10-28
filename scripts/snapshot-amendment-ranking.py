"""Deriva a base datada de ranking do ZIP oficial CGU; não contém favorecidos/CPF."""
import csv,datetime,decimal,hashlib,io,json,re,sys,zipfile
from pathlib import Path
archive=Path(sys.argv[1]); published=sys.argv[2] if len(sys.argv)>2 else None
groups={};codes=set()
def cents(value):
 if not re.fullmatch(r'-?\d+(?:\.\d{3})*(?:,\d{1,2})?',value):raise ValueError('Formato monetário incompatível')
 return int(decimal.Decimal(value.replace('.','').replace(',','.'))*100)
with zipfile.ZipFile(archive) as z:
 with io.TextIOWrapper(z.open('EmendasParlamentares.csv'),encoding='cp1252') as stream:
  for r in csv.DictReader(stream,delimiter=';'):
   if r['Ano da Emenda']!='2026' or not r['Tipo de Emenda'].lower().startswith('emenda individual'):continue
   code=r['Código da Emenda'];author=r['Código do Autor da Emenda'];name=r['Nome do Autor da Emenda']
   if code in codes or not re.fullmatch(r'2026\d{8}',code) or code[4:8]!=author:raise ValueError('Código duplicado ou autoria inconsistente')
   codes.add(code);g=groups.setdefault((author,name),{'code':'aggregate:'+author+':'+name,'authorCode':author,'authorName':name,'committed':0,'liquidated':0,'paid':0,'remainingPaid':0,'amendmentCount':0})
   for k,col in [('committed','Valor Empenhado'),('liquidated','Valor Liquidado'),('paid','Valor Pago'),('remainingPaid','Valor Restos A Pagar Pagos')]:g[k]+=cents(r[col])
   g['amendmentCount']+=1
records=list(groups.values())
for g in records:
 for k in ['committed','liquidated','paid','remainingPaid']:g[k]=g[k]/100
result={'year':2026,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'publishedAt':published,'source':'https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares','archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'amendmentCount':len(codes),'records':records}
Path('src/data/amendment-execution-2026.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(len(records),'autores;',len(codes),'emendas individuais')
