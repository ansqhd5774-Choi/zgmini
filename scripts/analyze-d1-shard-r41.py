import argparse, json, os, sqlite3, hashlib
from collections import defaultdict

def q(name):
    return '"' + name.replace('"','""') + '"'

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('db')
    ap.add_argument('--out', default='work/d1-r41-shard-analysis.json')
    args=ap.parse_args()

    con=sqlite3.connect(args.db)
    con.row_factory=sqlite3.Row
    cur=con.cursor()

    page_size=cur.execute('PRAGMA page_size').fetchone()[0]
    page_count=cur.execute('PRAGMA page_count').fetchone()[0]
    freelist=cur.execute('PRAGMA freelist_count').fetchone()[0]

    objects=[dict(r) for r in cur.execute("""
      SELECT type,name,tbl_name,sql
      FROM sqlite_master
      WHERE name NOT LIKE 'sqlite_%'
      ORDER BY type,name
    """)]

    tables=[r['name'] for r in objects if r['type']=='table' and r['name']!='_cf_KV']

    dbstat_available=True
    try:
        stat_rows=[dict(r) for r in cur.execute("""
          SELECT name, SUM(pgsize) AS bytes, COUNT(*) AS pages
          FROM dbstat
          GROUP BY name
          ORDER BY bytes DESC
        """)]
    except Exception as e:
        dbstat_available=False
        stat_rows=[]
        dbstat_error=str(e)

    bytes_by_object={r['name']:int(r['bytes'] or 0) for r in stat_rows}
    pages_by_object={r['name']:int(r['pages'] or 0) for r in stat_rows}

    index_owner={}
    for r in objects:
        if r['type']=='index':
            index_owner[r['name']]=r['tbl_name']

    per_table=[]
    total_rows=0
    for t in tables:
        count=cur.execute(f'SELECT COUNT(*) FROM {q(t)}').fetchone()[0]
        total_rows+=count
        cols=[dict(r) for r in cur.execute(f'PRAGMA table_info({q(t)})')]
        fks=[dict(r) for r in cur.execute(f'PRAGMA foreign_key_list({q(t)})')]
        idx=[dict(r) for r in cur.execute(f'PRAGMA index_list({q(t)})')]
        table_bytes=bytes_by_object.get(t,0)
        index_bytes=0
        owned_indexes=[]
        for i in idx:
            name=i['name']
            b=bytes_by_object.get(name,0)
            index_bytes+=b
            owned_indexes.append({'name':name,'bytes':b,'unique':i['unique'],'origin':i['origin']})
        per_table.append({
            'table':t,
            'rows':count,
            'table_bytes':table_bytes,
            'index_bytes':index_bytes,
            'total_bytes':table_bytes+index_bytes,
            'columns':cols,
            'foreign_keys':fks,
            'indexes':owned_indexes,
        })

    per_table.sort(key=lambda x:x['total_bytes'], reverse=True)

    result={
        'db_path':os.path.abspath(args.db),
        'file_bytes':os.path.getsize(args.db),
        'page_size':page_size,
        'page_count':page_count,
        'freelist_count':freelist,
        'used_bytes_estimate':(page_count-freelist)*page_size,
        'dbstat_available':dbstat_available,
        'dbstat_error':None if dbstat_available else dbstat_error,
        'table_count':len(tables),
        'row_total':total_rows,
        'tables':per_table,
    }
    raw=json.dumps(result,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
    result['analysis_sha256']=hashlib.sha256(raw).hexdigest()

    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)
    with open(args.out,'w',encoding='utf-8') as f:
        json.dump(result,f,ensure_ascii=False,indent=2)
    print(json.dumps({
        'file_bytes':result['file_bytes'],
        'used_bytes_estimate':result['used_bytes_estimate'],
        'table_count':result['table_count'],
        'row_total':result['row_total'],
        'dbstat_available':result['dbstat_available'],
        'top10':[{'table':x['table'],'bytes':x['total_bytes'],'rows':x['rows']} for x in per_table[:10]],
        'out':args.out,
    },ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
