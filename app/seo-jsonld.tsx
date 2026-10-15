const SITE_URL='https://zgmini.kr';
const WEBSITE_ID=`${SITE_URL}/#website`;
const ORGANIZATION_ID=`${SITE_URL}/#organization`;

function JsonLd({value}:{value:Record<string,unknown>}){
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(value).replace(/</g,'\\u003c')}}/>;
}

export function BreadcrumbJsonLd({name,path}:{name:string;path:string}){
  const url=new URL(path,SITE_URL).toString();
  return <JsonLd value={{
    '@context':'https://schema.org',
    '@type':'BreadcrumbList',
    '@id':`${url}#breadcrumb`,
    itemListElement:[
      {'@type':'ListItem',position:1,name:'ZGmini',item:`${SITE_URL}/`},
      {'@type':'ListItem',position:2,name,item:url},
    ],
  }}/>;
}

export function WebPageJsonLd({name,description,path}:{name:string;description:string;path:string}){
  const url=new URL(path,SITE_URL).toString();
  return <>
    <JsonLd value={{
      '@context':'https://schema.org',
      '@type':'WebPage',
      '@id':`${url}#webpage`,
      url,
      name,
      description,
      inLanguage:'ko-KR',
      isPartOf:{'@id':WEBSITE_ID},
      publisher:{'@id':ORGANIZATION_ID},
      breadcrumb:{'@id':`${url}#breadcrumb`},
    }}/>
    <BreadcrumbJsonLd name={name} path={path}/>
  </>;
}

export function ArticleJsonLd({headline,description,path,datePublished,dateModified}:{headline:string;description:string;path:string;datePublished:string;dateModified:string}){
  const url=new URL(path,SITE_URL).toString();
  return <JsonLd value={{
    '@context':'https://schema.org',
    '@type':'Article',
    '@id':`${url}#article`,
    headline,
    description,
    url,
    mainEntityOfPage:{'@id':`${url}#webpage`},
    inLanguage:'ko-KR',
    datePublished,
    dateModified,
    author:{'@id':ORGANIZATION_ID},
    publisher:{'@id':ORGANIZATION_ID},
  }}/>;
}
