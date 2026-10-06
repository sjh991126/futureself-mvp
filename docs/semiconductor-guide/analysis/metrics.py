import pandas as pd, numpy as np, json, os
S=os.path.dirname(os.path.abspath(__file__))+'/..'
P=pd.read_csv(f'{S}/data/prices_adj_daily.csv',index_col=0,parse_dates=True)
uni=pd.read_csv(f'{S}/data/universe.csv',dtype={'code':str}).set_index('code')
codes=[c for c in uni.index if c in P.columns]
P=P['2016-01-01':]
C0='2023-01-01'
r=P.pct_change()
logr=np.log(P).diff()
W=P.resample('W-FRI').last(); rw=W.pct_change()
Mo=P.resample('ME').last(); rm=Mo.pct_change()
def mdd(s):
    s=s.dropna(); 
    if len(s)<2: return np.nan
    return float((s/s.cummax()-1).min()*100)
def beta(x,y):
    d=pd.concat([x,y],axis=1).dropna()
    if len(d)<30: return np.nan
    return float(np.cov(d.iloc[:,0],d.iloc[:,1])[0,1]/np.var(d.iloc[:,1],ddof=1))
def corr(x,y):
    d=pd.concat([x,y],axis=1).dropna()
    return float(d.corr().iloc[0,1]) if len(d)>=30 else np.nan
def vr(x,q=4):
    x=x.dropna()
    if len(x)<60: return np.nan
    xq=x.rolling(q).sum().dropna()
    return float(np.var(xq,ddof=1)/(q*np.var(x,ddof=1)))
out={}
hy=rw['000660']; ss=rw['005930']; kp=rw['KOSPI']; kq=rw['KOSDAQ']
for c in codes:
    s=P[c]; sc=s[C0:].dropna()
    rc=r[c][C0:].dropna(); rwc=rw[c][C0:]
    m={}
    m['name']=uni.loc[c,'name']; m['group']=uni.loc[c,'group']; m['sub']=uni.loc[c,'sub']
    m['first']=s.first_valid_index().date().isoformat()
    m['last_close']=float(s.dropna().iloc[-1])
    if len(sc)>60:
        m['ret_C']=float((sc.iloc[-1]/sc.iloc[0]-1)*100)
        yrs=(sc.index[-1]-sc.index[0]).days/365.25
        m['cagr_C']=float(((sc.iloc[-1]/sc.iloc[0])**(1/yrs)-1)*100)
        m['vol_C']=float(rc.std()*np.sqrt(252)*100)
        m['mdd_C']=mdd(sc)
        m['beta_kospi']=beta(rwc,kp[C0:]); m['beta_kosdaq']=beta(rwc,kq[C0:])
        m['corr_hynix']=corr(rwc,hy[C0:]); m['corr_samsung']=corr(rwc,ss[C0:]); m['corr_kospi']=corr(rwc,kp[C0:])
        # lead/lag vs hynix: corr(stock_t, hynix_{t-k}), k=-2..2 ; positive k => hynix leads
        ll={}
        for k in range(-3,4):
            ll[k]=corr(rwc,hy[C0:].shift(k))
        best=max(ll,key=lambda k: (ll[k] if ll[k]==ll[k] else -9))
        m['hynix_lag_best']=int(best); m['hynix_lag_corr']=ll[best]; m['hynix_ll']={str(k):v for k,v in ll.items()}
        m['vr4']=vr(rwc)
        m['jump_freq']=float((rc.abs()>0.08).mean()*100)
        m['jump_up_days']=int((rc>0.08).sum()); m['jump_dn_days']=int((rc<-0.08).sum())
        lp=logr[c][C0:].dropna(); pos=lp[lp>0]
        m['top10_share']=float(pos.sort_values(ascending=False).head(10).sum()/pos.sum()*100) if pos.sum()>0 else np.nan
        m['skew_C']=float(rc.skew())
        m['limit_up_days']=int((rc>0.295).sum())
    # full-period
    rf=r[c].dropna()
    m['vol_full']=float(rf.std()*np.sqrt(252)*100) if len(rf)>250 else np.nan
    m['corr_hynix_full']=corr(rw[c],hy)
    m['ac1_m']=float(rm[c].dropna().autocorr(1)) if rm[c].dropna().shape[0]>36 else np.nan
    # calendar-year returns
    yr={}
    for y in range(2016,2027):
        sy=s[str(y)].dropna()
        prev=s[:f'{y-1}-12-31'].dropna()
        if len(sy)>10 and len(prev)>0:
            yr[str(y)]=float((sy.iloc[-1]/prev.iloc[-1]-1)*100)
    m['yr']=yr
    # seasonality (monthly mean return by calendar month, full period)
    mm=rm[c].dropna()
    if len(mm)>=48:
        by=mm.groupby(mm.index.month).mean()*100
        m['season']=[float(by.get(i,np.nan)) for i in range(1,13)]
        m['best_month']=int(by.idxmax()); m['worst_month']=int(by.idxmin())
        h1=mm[mm.index.month<=6].mean()*100; h2=mm[mm.index.month>6].mean()*100
        m['h1_avg']=float(h1); m['h2_avg']=float(h2)
    # 2026 path
    out[c]=m
# market refs
for c in ['KOSPI','KOSDAQ']:
    sc=P[c][C0:].dropna(); rc=r[c][C0:].dropna()
    out[c]={'name':c,'group':'index','ret_C':float((sc.iloc[-1]/sc.iloc[0]-1)*100),'vol_C':float(rc.std()*np.sqrt(252)*100),'mdd_C':mdd(sc),
            'yr':{str(y):float((P[c][str(y)].dropna().iloc[-1]/P[c][:f'{y-1}-12-31'].dropna().iloc[-1]-1)*100) for y in range(2017,2027)}}
json.dump(out,open(f'{S}/data/metrics.json','w'),ensure_ascii=False,indent=1,default=lambda x: None if x!=x else x)
# group indices (equal weight, daily chain-linked) from 2016
G={}
for g in ['memory','design','equip_fe','equip_be','material','test','osat','substrate','infra']:
    mem=[c for c in codes if uni.loc[c,'group']==g]
    gr=r[mem].mean(axis=1,skipna=True)
    G[g]=(1+gr.fillna(0)).cumprod()
G=pd.DataFrame(G); G['KOSPI']=P['KOSPI']/P['KOSPI'].dropna().iloc[0]; G['KOSDAQ']=P['KOSDAQ']/P['KOSDAQ'].dropna().iloc[0]
G['hynix']=P['000660']/P['000660'].iloc[0]; G['samsung']=P['005930']/P['005930'].iloc[0]
Gw=G.resample('W-FRI').last()
Gw.to_csv(f'{S}/data/group_index_weekly.csv',float_format='%.4f')
Mo.to_csv(f'{S}/data/prices_monthly.csv',float_format='%.2f')
# print summaries
df=pd.DataFrame(out).T
cols=['name','group','ret_C','vol_C','mdd_C','beta_kospi','corr_hynix','hynix_lag_best','vr4','jump_freq','top10_share','ac1_m','best_month','worst_month']
pd.set_option('display.width',250); pd.set_option('display.max_rows',200)
print(df[cols].sort_values('corr_hynix',ascending=False).to_string())
print(Mo[['000660','005930','KOSPI']]['2022-01':].to_string())
