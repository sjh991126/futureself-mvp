import pandas as pd, numpy as np, json, os, csv, io, math
S=os.path.dirname(os.path.abspath(__file__))+'/..'
K='/home/user/james-brand/korea-market-data'
uni=pd.read_csv(f'{S}/data/universe.csv',dtype={'code':str}).set_index('code')
met=json.load(open(f'{S}/data/metrics.json'))
def sig(x,n=4):
    if x is None or (isinstance(x,float) and (math.isnan(x) or math.isinf(x))): return None
    if x==0: return 0
    return float(f'{x:.{n}g}')
# snapshot: foreign flows
ff=pd.read_csv(f'{K}/data/foreign-flows-aggregates.csv',comment='#',dtype={'ticker':str})
ff=ff.set_index('ticker')
scr=pd.read_csv('/home/user/sbkim21kr/kospi_kosdaq_livermore_pearl_screener/output/latest.csv',dtype={'StockCode':str},encoding='utf-8-sig').set_index('StockCode')
snap={}
for c in uni.index:
    d={}
    if c in ff.index:
        r=ff.loc[c]; d['f20']=sig(float(r['f_20d_val'])/1e8,4); d['f5']=sig(float(r['f_5d_val'])/1e8,4); d['i20sh']=int(r['i_20d_sh']); d['close1002']=float(r['last_close'])
    if c in scr.index:
        r=scr.loc[c]
        for k,kk in [('RSI(14)','rsi'),('MA20','ma20'),('MA60','ma60'),('ClosingPrice','close')]:
            try: d[kk]=sig(float(r[k]),5)
            except: pass
    snap[c]=d
# sector series 2026
sec=json.load(open(f'{K}/data/korea-sectors-latest.json'))
dates=sec['series']['dates']
lines={}
for l in sec['series']['lines']:
    nm=l['sector_ko']
    if nm in ('코스피','코스닥') or '반도체' in nm or '전기' in nm or 'IT' in nm:
        lines[f"{l['market']} {nm}"]=[sig(v,5) for v in l['values']]
print(list(lines.keys()))
bench={k:{'close':v['close'],'ytd':v['return_ytd_pct'],'m1':v['return_1m_pct']} for k,v in sec['benchmarks'].items()}
sect={s['sector_ko']:{'market':s['market'],'close':s['close'],'ytd':s['return_ytd_pct'],'m1':s['return_1m_pct'],'w1':s['return_1w_pct']} for s in sec['sectors'] if ('반도체' in s['sector_ko'] or '전기' in s['sector_ko'])}
print(bench, sect)
# monthly closes
Mo=pd.read_csv(f'{S}/data/prices_monthly.csv',index_col=0,parse_dates=True)['2016-01-01':]
mon={'dates':[d.strftime('%Y-%m') for d in Mo.index]}
for c in list(uni.index)+['KOSPI','KOSDAQ']:
    if c in Mo.columns: mon[c]=[sig(v,4) for v in Mo[c].tolist()]
Gw=pd.read_csv(f'{S}/data/group_index_weekly.csv',index_col=0,parse_dates=True)['2016-01-01':]
# rebase group index to 100 at 2023-01 first week
base=Gw['2023-01-01':].iloc[0]
gw={'dates':[d.strftime('%Y-%m-%d') for d in Gw.index]}
for c in Gw.columns: gw[c]=[sig(v,4) for v in (Gw[c]/Gw[c].dropna().iloc[0]*100).tolist()]
gw['base_2023']={c:sig(float(base[c]/Gw[c].dropna().iloc[0]*100),5) for c in Gw.columns}
# metrics rounded
MET={}
keep=['name','group','sub','first','last_close','ret_C','cagr_C','vol_C','mdd_C','beta_kospi','beta_kosdaq','corr_hynix','corr_samsung','corr_kospi','hynix_lag_best','hynix_lag_corr','vr4','jump_freq','jump_up_days','jump_dn_days','top10_share','skew_C','limit_up_days','vol_full','corr_hynix_full','ac1_m','best_month','worst_month','h1_avg','h2_avg']
for c,m in met.items():
    o={}
    for k in keep:
        v=m.get(k)
        o[k]=sig(v,4) if isinstance(v,float) else v
    o['yr']={k:sig(v,4) for k,v in m.get('yr',{}).items()}
    if 'season' in m: o['season']=[sig(v,3) for v in m['season']]
    MET[c]=o
UNI=[{'code':c,'name':r['name'],'group':r['group'],'sub':r['sub']} for c,r in uni.iterrows()]
data={'asof':'2026-10-01','C0':'2023-01-02','UNI':UNI,'MET':MET,'SNAP':snap,'MON':mon,'GW':gw,'YTD26':{'dates':dates,'lines':lines,'bench':bench,'sect':sect}}
js='window.SEMI_DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';'
open(f'{S}/guide/data.js','w').write(js)
print(len(js)//1024,'KB')
# group summary table for my reading
df=pd.DataFrame(MET).T
for g in ['memory','design','equip_fe','equip_be','material','test','osat','substrate','infra']:
    d=df[df.group==g]
    print(g, 'n=',len(d), 'ret_C med',d.ret_C.median(), 'corr_hynix med',d.corr_hynix.median(), 'vol med', d.vol_C.median(), 'jump med', d.jump_freq.median(), 'top10 med', d.top10_share.median())
print(pd.DataFrame(snap).T[['f20','rsi']].sort_values('f20',ascending=False).head(12))
print(pd.DataFrame(snap).T[['f20','rsi']].sort_values('f20').head(8))
