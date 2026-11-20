/* Recovery-only CommonJS browser helpers; no application import. */
/* eslint-disable @typescript-eslint/no-require-imports */
// Recovery harness: known ambiguous validation-alert selector is intentionally preserved.
const { chromium } = require(process.env.AUDIT_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const { installMocks, detail } = require('./mock-fixtures.cjs');
const out = process.env.AUDIT_OUTPUT || '/tmp/mallbyte-storefront-handoff-audit';
const headers = {'access-control-allow-origin':'http://127.0.0.1:3000','access-control-allow-credentials':'true','access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','access-control-allow-headers':'authorization,content-type'};
const json = (r, body, status=200) => r.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(body)});
async function capture(browser,item,width) {
  const context = await browser.newContext({viewport:{width,height:960},deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:width===390?'dark':'light'});
  const mocks = await installMocks(context,item), errors=[];
  if (item.productState) await context.route('http://localhost:8000/api/products/products/1/', async r => {
    if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers});
    if(item.productState==='loading')await new Promise(resolve=>setTimeout(resolve,10000));
    if(item.productState==='error')return json(r,{detail:'This product is temporarily unavailable. Please try again.'},503);
    let data={...detail};
    if(item.productState==='unavailable')data={...data,is_in_stock:false,available_stock:0};
    if(item.productState==='missing')data={...data,images:[]};
    if(item.productState==='long')data={...data,name:'LimitedEditionEverydayCarryallWithReinforcedNaturalCottonHandlesAndThoughtfullyOrganisedInteriorCompartmentsForTravelWorkAndTheWeekend',seller_name:'IndependentDesignStudioWithAReallyLongUnbrokenStoreNameForLayoutVerification',sku:'MALLBYTE-ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',images:Array.from({length:6},(_,i)=>({...detail.images[0],id:i+1,is_main:i===1,image:'http://localhost:8000/visual-media/product-'+i+'.svg',alt_text:'Carryall view '+(i+1)}))};
    if(item.productState==='broken')data={...data,images:[{...detail.images[0],image:'http://localhost:8000/broken-media.jpg'}]};
    return json(r,data);
  });
  if(item.productState==='broken')await context.route('http://localhost:8000/broken-media.jpg',r=>r.fulfill({status:404,body:''}));
  if(item.action==='saved')await context.route('http://localhost:8000/api/products/wishlist/',r=>r.request().method()==='POST'?json(r,{id:3,product:1,product_name:detail.name,product_price:'89.00',product_image:detail.main_image,created_at:'2026-11-01T10:00:00Z'}):r.fallback());
  if(item.cms)await context.route('http://localhost:8000/api/content/homepage/',r=>json(r,{banners:[{id:1,title:'Objects with a story. Made for everyday.',subtitle:'Meet the independent stores and considered designs behind the collection.',placement:'home_hero',image:'http://localhost:8000/visual-media/product-0.svg',mobile_image:'http://localhost:8000/visual-media/product-1.svg',cta_text:'Meet the collection',link_url:'/products?label=new',background_color:'#edf8f9',text_color:'#17252f',is_clickable:true,order:0,status:'published',is_visible:true}],announcements:[{id:1,title:'Meet our makers',message:'Explore the latest additions to our independent marketplace.',level:'info',link_url:'/products?label=new',link_text:'Explore new arrivals',is_visible:true}],featured_pages:[],featured_faqs:[]}));
  const page = await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try {
    await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/token/refresh/',{timeout:90000}),page.goto('http://127.0.0.1:3000'+item.route,{waitUntil:'domcontentloaded',timeout:90000})]);
    if(item.route==='/')await page.getByRole('heading',{name:item.cms?'Objects with a story. Made for everyday.':'About MallByte',exact:true}).waitFor();
    else if(item.state==='loading')await page.getByText('Loading products...',{exact:true}).waitFor();
    else if(item.productState==='loading')await page.getByText('Loading product...',{exact:true}).waitFor();
    else if(item.state==='error')await page.getByRole('heading',{name:'Could not load products'}).waitFor();
    else if(item.state==='empty')await page.getByRole('heading',{name:'No products yet'}).waitFor();
    else if(item.productState==='error')await page.getByRole('heading',{name:'Could not load product'}).waitFor();
    else if(item.route==='/products')await page.locator('article').first().waitFor();
    else await page.getByRole('heading',{level:1}).waitFor();
    if(item.state!=='loading'&&item.productState!=='loading')await page.waitForLoadState('networkidle');
    if(item.role==='customer')await page.getByRole('button',{name:'Notifications',exact:true}).waitFor();
    if(item.route==='/products/1'&&!['error','loading'].includes(item.productState))await page.getByRole('button',{name:'Add to wishlist',exact:true}).waitFor();
    await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
    if(item.action==='filters')await page.getByRole('button',{name:'Show filters',exact:true}).click();
    if(item.action==='validation') {await page.getByRole('button',{name:'Show filters',exact:true}).click();await page.getByLabel('Min price',{exact:true}).fill('100');await page.getByLabel('Max price',{exact:true}).fill('10');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.getByRole('alert').waitFor();}
    if(item.action==='gallery') {const last=page.getByRole('button',{name:/View image 6 of/});await last.focus();await page.keyboard.press('Enter');}
    if(item.action==='saved') {await page.getByRole('button',{name:'Add to wishlist',exact:true}).click();await page.getByRole('button',{name:'Remove from wishlist',exact:true}).waitFor();}
    await page.waitForTimeout(250);
    const file=path.join(out,item.name+'-'+width+'.png');await page.screenshot({path:file,fullPage:true,caret:'initial'});
    const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,colorScheme:getComputedStyle(document.documentElement).colorScheme,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent),firstProductTop:document.querySelector('article')?.getBoundingClientRect().top+scrollY,primaryBuyTop:[...document.querySelectorAll('button')].find(e=>e.textContent==='Add to cart')?.getBoundingClientRect().top+scrollY,disabledBuy:[...document.querySelectorAll('button')].find(e=>e.textContent==='Add to cart')?.disabled,images:[...document.querySelectorAll('img')].map(e=>({alt:e.alt,complete:e.complete,naturalWidth:e.naturalWidth,loading:e.loading,currentSrc:e.currentSrc})),overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)}).slice(0,10).map(e=>({tag:e.tagName,text:e.textContent?.slice(0,90)}))}));
    const result={...item,width,file,metrics,pageErrors:errors,unmocked:mocks.unmocked,requests:mocks.requests};
    await fs.writeFile(path.join(out,item.name+'-'+width+'.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({name:item.name,width,overflow:metrics.scrollWidth>width,errors,unmocked:mocks.unmocked}));
    return result;
  } catch(error) {await page.screenshot({path:path.join(out,'FAILED-'+item.name+'-'+width+'.png'),fullPage:true,caret:'initial'}).catch(()=>{});const result={...item,width,error:error.message,pageErrors:errors,unmocked:mocks.unmocked,requests:mocks.requests};console.error(JSON.stringify(result));return result;}
  finally {await context.close();}
}
(async()=>{await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true});const results=[];try {
  const only=process.env.AUDIT_ONLY?.split(',');
  for(const item of[{name:'home',route:'/',role:'guest'},{name:'catalog',route:'/products',role:'guest'},{name:'product',route:'/products/1',role:'customer'}])for(const width of[360,390,768,1024,1280,1440])if(!only||only.includes(item.name))results.push(await capture(browser,item,width));
  const states=[{name:'catalog-open',route:'/products',role:'guest',action:'filters'},{name:'catalog-validation',route:'/products',role:'guest',action:'validation'},...['empty','loading','error','long-text'].map(state=>({name:'catalog-'+state,route:'/products',role:'guest',state})),...['unavailable','missing','broken','loading','error','long'].map(productState=>({name:'product-'+productState,route:'/products/1',role:'customer',productState,action:productState==='long'?'gallery':undefined})),{name:'product-saved',route:'/products/1',role:'customer',action:'saved'}];
  for(const item of states)if(!only||only.includes(item.name))results.push(await capture(browser,item,390));
  for(const width of[390,1440])if(!only||only.includes('home-cms'))results.push(await capture(browser,{name:'home-cms',route:'/',role:'guest',cms:true},width));
  const summary={captureDate:new Date().toISOString(),source:'WIP storefront implementation; see source-sha256.json',results};await fs.writeFile(path.join(out,'summary-'+(process.env.AUDIT_ONLY||'all').replaceAll(',','-')+'.json'),JSON.stringify(summary,null,2));
  if(results.some(r=>r.error||r.pageErrors.length||r.unmocked.length||r.metrics.scrollWidth>r.width))process.exitCode=1;
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
