import pandas as pd, numpy as np, json, os, sys
S=os.path.dirname(os.path.abspath(__file__))+'/..'
M='/home/user/financedata/marcap/data'
uni=pd.read_csv(f'{S}/data/universe.csv',dtype={'code':str})
codes=set(uni.code)
frames=[]
for y in range(2015,2027):
    df=pd.read_parquet(f'{M}/marcap-{y}.parquet',columns=['Code','Name','Close','ChangesRatio','Marcap','Market','Date','Volume','Amount'])
    frames.append(df)
    print(y,len(df),file=sys.stderr)
df=pd.concat(frames,ignore_index=True)
df['Date']=pd.to_datetime(df['Date'])
# market proxies: chain-linked cap-weighted return on common constituents
def proxy(mkt):
    d=df[df.Market==mkt][['Date','Code','Marcap','ChangesRatio','Close']].copy()
    d=d.sort_values(['Code','Date'])
    d['prev_mcap']=d.groupby('Code')['Marcap'].shift(1)
    d['prev_date']=d.groupby('Code')['Date'].shift(1)
    d['r']=d['ChangesRatio']/100.0
    # weight by previous marcap; only rows whose prev_date is the previous trading day
    dates=np.sort(d['Date'].unique())
    prevmap={dates[i]:dates[i-1] for i in range(1,len(dates))}
    d['expected_prev']=d['Date'].map(prevmap)
    ok=d[(d.prev_date==d.expected_prev)&d.r.notna()&d.prev_mcap.notna()]
    g=ok.groupby('Date').apply(lambda x: np.average(x.r,weights=x.prev_mcap))
    idx=(1+g).cumprod()*100
    return idx
kospi=proxy('KOSPI'); kosdaq=proxy('KOSDAQ')
print('proxy built',kospi.index.min(),kospi.index.max(),file=sys.stderr)
# universe adjusted prices
u=df[df.Code.isin(codes)].sort_values(['Code','Date']).copy()
u['r']=u['ChangesRatio']/100.0
u['r_close']=u.groupby('Code')['Close'].pct_change()
# where ChangesRatio missing, fall back to close pct change
u['r']=u['r'].where(u['r'].notna(),u['r_close'])
# sanity: when close pct and changesratio differ massively (split), trust ChangesRatio
adj={}
names={}
for c,g in u.groupby('Code'):
    g=g.set_index('Date')
    names[c]=g['Name'].iloc[-1]
    rr=g['r'].fillna(0.0).copy(); rr.iloc[0]=0.0
    lvl=(1+rr).cumprod()
    # back-adjust so last value equals last actual close
    adj[c]=lvl/lvl.iloc[-1]*g['Close'].iloc[-1]
P=pd.DataFrame(adj)
P['KOSPI']=kospi; P['KOSDAQ']=kosdaq
P=P.sort_index()
P.to_csv(f'{S}/data/prices_adj_daily.csv',float_format='%.4f')
json.dump(names,open(f'{S}/data/names_marcap.json','w'),ensure_ascii=False)
# raw closes too (for sanity)
R=u.pivot(index='Date',columns='Code',values='Close'); R.to_csv(f'{S}/data/prices_raw_daily.csv')
print(P.shape, P.index.min(), P.index.max())
print(P[['005930','000660','KOSPI','KOSDAQ']].iloc[[0,-1]])
# split check samsung 2018-05-04
s=u[(u.Code=='005930')&(u.Date>='2018-05-02')&(u.Date<='2018-05-08')][['Date','Close','ChangesRatio','r_close']]
print(s.to_string())
missing=[c for c in codes if c not in P.columns]; print('missing',missing)
first={c:P[c].first_valid_index().date().isoformat() for c in P.columns if c in codes}
print({c:v for c,v in first.items() if v>'2016-01-01'})
