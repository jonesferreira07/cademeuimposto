"""Normaliza uma cópia dos arquivos públicos do Contas do Poder (MIT).
Não executa coletores externos, não usa os totais arredondados do site e não retém CPF/matrícula.
Uso: python3 scripts/normalize-state-data.py /pasta/dos/arquivos/baixados
O diretório deve conter os JSONs e CSVs listados em source-layout no README.
"""
import csv,json,re,sys,unicodedata
from pathlib import Path
from collections import defaultdict
from decimal import Decimal,ROUND_HALF_UP
source=Path(sys.argv[1])
assembly=json.loads((source/'assembleias.json').read_text())
governors=json.loads((source/'governadores.json').read_text())
inputs=json.loads((source/'governadores-input.json').read_text())
sha=(source/'revision.txt').read_text().strip()
root=Path(__file__).resolve().parents[1]
normal=lambda s: re.sub(r'[^A-Z0-9]+',' ',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().upper()).strip()
def cents(value):
 if value in [None,'']:return None
 return int((Decimal(str(value))*100).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
def total(row,fields):
 values=[cents(row.get(k)) for k in fields]
 return sum(v for v in values if v is not None) if any(v is not None for v in values) else None
def photo(person):
 path=person.get('f');credit=person.get('fc')
 if not path or not credit:return {'photo':None,'photoCredit':None}
 return {'photo':f'https://raw.githubusercontent.com/jflaloux/contas-do-poder/{sha}/site/{path}','photoCredit':{'author':credit.get('a'),'license':credit.get('l'),'source':credit.get('u')}}
people=[]
for person in assembly['p']:
 if not person.get('x'):continue
 people.append({'id':person['id'],'name':person['n'],'civilName':person.get('nc') or person['n'],'uf':person['uf'],'role':'assembly','party':person.get('pt'),'profile':person.get('o'), 'origin':'consolidated',**photo(person)})
for state in governors['e']:
 person=state['gov'];seed=next(x for x in inputs if x['uf']==state['uf']);occupant=next(o for o in seed['ocupantes'] if o['nome']==person['n'] and o['cargo'] in ['gov','exercicio'] and not o.get('ate'))
 aliases={normal(x) for x in [person['n'],person.get('nc',''),occupant.get('folha_nome',''),state.get('folha',{}).get('c',{}).get('nome','')] if x}
 people.append({'id':person['id'],'name':person['n'],'civilName':person.get('nc') or person['n'],'uf':state['uf'],'role':'government','party':None,'profile':seed['folha'].get('url'),'origin':'consolidated','aliases':sorted(aliases),**photo(person)})
state_sources={}
for uf,info in assembly['meta']['estados'].items():
 gov=next(x for x in governors['e'] if x['uf']==uf)
 state_sources[uf]={'assembly':info.get('fontes',{}),'government':gov.get('mf',{}).get('u') or gov.get('folha',{}).get('u'),'governmentNote':gov.get('mf',{}).get('nota',''),'assemblyNote':info.get('salario_nota',''),'lastAssemblyMonth':info.get('ultimo_mes'),'reference':info.get('subsidio',[])}
agg=defaultdict(int);details={}
for path in sorted((source/'dados/governadores/folha').glob('*.csv')):
 uf=path.stem.upper()
 for row in csv.DictReader(path.open()):
  if row.get('tp')!='gov':continue
  am=int(row['aaaamm']); amount=cents(row.get('bruto'))
  if amount is None or am<202601 or am>202610:continue
  key=(uf,'government',normal(row['nome']),am)
  agg[key]+=amount
  details[key]={'name':row['nome'],'source':state_sources[uf]['government'],'dataFile':f'https://github.com/jflaloux/contas-do-poder/blob/{sha}/dados/governadores/folha/{path.name}','label':'Créditos brutos publicados na folha, antes dos descontos pessoais. Podem incluir outras funções, férias, 13º e auxílios.','position':row.get('cargo','')}
for path in sorted((source/'dados/assembleias').glob('*/folha_deputados.csv')):
 uf=path.parent.name.upper()
 for row in csv.DictReader(path.open()):
  am=int(row['ano'])*100+int(row['mes'])
  if am<202601 or am>202610:continue
  value=None
  if uf in ['AL','AP','MT','PI']:value=cents(row.get('valor'))
  elif uf in ['CE','RS']:value=cents(row.get('bruta'))
  elif uf in ['PA','PR']:value=cents(row.get('bruto'))
  elif uf=='RR':value=cents(row.get('proventos'))
  elif uf=='SE':value=cents(row.get('c10'))
  elif uf=='DF':value=total(row,['subsidio','cargo_comissao','vantagens_eventuais','vantagens_pessoais','outros_creditos','aux_preescolar','aux_transporte','aux_alimentacao'])
  if value is None:continue
  key=(uf,'assembly',normal(row['nome']),am);agg[key]+=value
  details[key]={'name':row['nome'],'source':state_sources[uf]['assembly'].get('folha'),'dataFile':f'https://github.com/jflaloux/contas-do-poder/blob/{sha}/dados/assembleias/{uf.lower()}/folha_deputados.csv','label':'Créditos brutos da folha consolidada, antes dos descontos pessoais. Componentes variam por instituição; não são o líquido depositado.','position':row.get('cargo','Deputado estadual/distrital')}
records=[{'uf':k[0],'role':k[1],'nameKey':k[2],'year':k[3]//100,'month':k[3]%100,'amount':v/100,**details[k]} for k,v in agg.items()]
metadata={'publisher':'Contas do Poder · Jean-François Laloux','source':'https://github.com/jflaloux/contas-do-poder','revision':sha,'importedAt':'2026-10-27','generatedAt':assembly['meta']['gerado_em'],'notice':'Cadastro e folhas importados de uma consolidação independente de fontes estaduais oficiais, não de uma API nacional oficial. A competência e os links originais acompanham cada valor. Ausência de registro não significa ausência de pagamento.'}
tmp=root/'src/data/state-people.json.tmp';tmp.write_text(json.dumps({'meta':metadata,'people':people,'sources':state_sources},ensure_ascii=False,separators=(',',':'))+'\n');tmp.replace(root/'src/data/state-people.json')
tmp=root/'src/data/state-payroll.json.tmp';tmp.write_text(json.dumps({'meta':metadata,'records':records},ensure_ascii=False,separators=(',',':'))+'\n');tmp.replace(root/'src/data/state-payroll.json')
print(json.dumps({'people':len(people),'states':len(state_sources),'governmentPayrollStates':len({r['uf'] for r in records if r['role']=='government'}),'assemblyPayrollStates':len({r['uf'] for r in records if r['role']=='assembly'}),'payrollRows':len(records)}))
