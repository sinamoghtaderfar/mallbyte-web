/* Recovery-only CommonJS browser helpers; no application import. */
// Fictional isolated browser fixtures. All unknown API endpoints fail closed.
const date = '2026-11-01T10:00:00Z';
const customer={id:7,email:'alex.morgan@example.test',full_name:'Alex Morgan',phone:'+49 151 23456789',is_seller:false,is_staff:false,is_superuser:false,email_verified:true};
const seller={...customer,is_seller:true};
const admin={...customer,is_staff:true,is_superuser:true,full_name:'Alex Morgan — Operations'};
const colors=['#b9b1a0','#a7b8b2','#c5ac97','#bcc4d0','#999eab','#d4c7af'];
function image(index){return `http://localhost:8000/visual-media/product-${index}.svg`;}
function svg(index){const color=colors[index%colors.length];return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#f1eee8"/><ellipse cx="400" cy="500" rx="180" ry="25" fill="#dedbd4"/><rect x="220" y="135" width="360" height="330" rx="28" fill="${color}"/><path d="M300 140v-25c0-120 200-120 200 0v25" fill="none" stroke="${color}" stroke-width="26"/><path d="M250 210h300M250 390h300" stroke="#ffffff" stroke-opacity=".28" stroke-width="3"/></svg>`;}
const names=['Everyday canvas carryall','Compact ceramic table lamp','Woven cotton throw','Studio wireless headphones','Essential mechanical keyboard','Handcrafted stoneware mug'];
const products=names.map((name,i)=>({id:i+1,name,slug:name.toLowerCase().replaceAll(' ','-'),main_image:image(i),price:String([89,119,65,159,139,28][i]),compare_price:i===0?'110.00':null,final_price:String([89,119,65,159,139,28][i]),brand_name:['Fieldwork','Forma','Common Thread','Sound Studio','Keystudio','Clay & Co.'][i],category_name:['Accessories','Home & living','Home & living','Technology','Technology','Home & living'][i],stock:12,available_stock:12,reserved_stock:0,is_featured:i===0,views_count:132,created_at:date,barcode:null,labels:i===0?['new']:[],label_display:i===0?['New arrival']:[]}));
const detail={...products[0],description:'Designed for days that take you everywhere. A considered everyday carryall made with durable cotton canvas, reinforced handles and a thoughtfully organised interior.',short_description:'A considered everyday essential, made to go wherever your day takes you.',seller_name:'Fieldwork Studio',seller_email:'studio@example.test',category:1,brand:1,brand_logo:null,sku:'FW-CARRY-01',is_in_stock:true,is_active:true,status:'approved',low_stock_threshold:3,weight:'0.5',length:'40',width:'15',height:'35',cost_per_item:null,images:[{id:1,image:image(0),alt_text:'Canvas carryall in warm sand',is_main:true,order:1,created_at:date},{id:2,image:image(1),alt_text:'Carryall interior',is_main:false,order:2,created_at:date}],variants:[],attributes:[{attribute:'Material',attribute_slug:'material',value:'Cotton canvas',value_slug:'cotton-canvas'}],tags:[],average_rating:'4.7',reviews_count:12,updated_at:date};
const page=results=>({count:results.length,next:null,previous:null,results});
const cart={id:1,user:7,items:products.slice(0,2).map((p,i)=>({id:i+1,product:p.id,product_name:p.name,product_sku:`FW-${i+1}`,product_price:p.price,available_stock:12,quantity:1,unit_price:p.price,total_price:p.price,created_at:date,updated_at:date})),total_items:2,subtotal:'208.00',created_at:date,updated_at:date};
const address={id:1,user:7,title:'Home',province:'Berlin',city:'Berlin',street:'Sample Street',alley:'',building_number:'12',floor:'2',unit:'4',postal_code:'10115',receiver_name:'Alex Morgan',receiver_phone:'+49 151 23456789',is_default:true,created_at:date,updated_at:date};
const review={id:1,customer:8,customer_display:'Jamie R.',product:1,product_name:products[0].name,order_item:1,rating:5,title:'Beautifully made and genuinely useful',comment:'Comfortable to carry and the right size for a day in the city. The canvas feels substantial without being heavy.',status:'approved',is_verified_purchase:true,approved_by:1,approved_by_display:null,approved_at:date,rejected_reason:'',helpful_count:8,not_helpful_count:0,created_at:date,updated_at:date};
const overview={users:12480,active_users:10246,sellers:284,pending_sellers:12,products:8640,pending_products:23,orders:18426,open_tickets:18,roles:6,recent_admin_actions:127};
async function installMocks(context,opts={}){
 const requests=[],unmocked=[];
 await context.route('http://localhost:8000/**', async route=>{
 const url=new URL(route.request().url()),p=url.pathname;
 const headers={'access-control-allow-origin':'http://127.0.0.1:3000','access-control-allow-credentials':'true','access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','access-control-allow-headers':'authorization,content-type'};
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
 if(p.startsWith('/visual-media/'))return route.fulfill({status:200,contentType:'image/svg+xml',headers,body:svg(Number(p.match(/product-(\d+)/)?.[1]||0))});
 requests.push(p+url.search);
 const user={...(opts.role==='admin'?admin:opts.role==='seller'?seller:customer)};if(opts.state==='long-text'){user.full_name='Alexandra Morgan Rivera — Everyday discoveries and independent design';user.email='alexandra.morgan.rivera.long.account.address@example.test';}
 const json=async(body,status=200)=>route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(body)});
 if(p==='/api/auth/token/refresh/')return opts.role==='guest'?json({detail:'No active session'},401):json({access:'visual-fixture-access'});
 if(p==='/api/auth/profile/')return json({user});
 if(p==='/api/rbac/my-permissions/')return json({user_id:user.id,permissions:opts.role==='admin'?['view_platform_analytics','view_content_drafts','manage_content','publish_content']:[]});
 if(p==='/api/content/navigation/')return json([]);
 if(p==='/api/content/homepage/')return json({banners:[],announcements:[],featured_pages:[{id:1,title:'Independent by design',slug:'about',excerpt:'Meet the makers and stores behind everyday discoveries.',is_visible:true}],featured_faqs:[{id:1,question:'How can I track my order?',answer:'Visit your orders to view fulfilment and delivery updates.',is_active:true}]});
 if(p==='/api/products/categories/')return json(page([{id:1,name:'Accessories',slug:'accessories',parent:null,children:[],parent_name:null,description:'',image:null,is_active:true,order:1,created_at:date},{id:2,name:'Home & living',slug:'home',parent:null,children:[],parent_name:null,description:'',image:null,is_active:true,order:2,created_at:date}]));
 if(p==='/api/products/brands/')return json(page([{id:1,name:'Fieldwork',slug:'fieldwork',logo:null,description:'',website:'',is_active:true,created_at:date}]));
 if(p==='/api/products/products/'){
 if(opts.state==='error')return json({detail:'Products are temporarily unavailable. Please try again.'},503);
 if(opts.state==='loading')await new Promise(r=>setTimeout(r,12000));
 return json(page(opts.state==='empty'?[]:opts.state==='long-text'?products.map((p,i)=>i===0?{...p,name:'Limited edition everyday carryall with reinforced natural cotton handles and thoughtfully organised interior compartments for travel, work and the weekend'}:p):products));}
 if(p==='/api/products/products/1/')return json(detail);
 if(p==='/api/products/products/1/add_view/')return json({views_count:133});
 if(p==='/api/products/products/1/related/')return json(products.slice(1,4));
 if(p==='/api/products/wishlist/')return json(page([]));
 if(p==='/api/products/recently-viewed/')return json([]);
 if(p==='/api/reviews/product-reviews/')return json(page([review]));
 if(p==='/api/reviews/product-reviews/summary/')return json({product_id:1,average_rating:'4.7',reviews_count:12,rating_breakdown:{1:0,2:0,3:1,4:2,5:9},total_approved_reviews:12});
 if(p==='/api/orders/cart/')return json(opts.state==='empty'?{...cart,items:[],total_items:0,subtotal:'0'}:cart);
 if(p==='/api/auth/addresses/')return opts.state==='address-error'?json({detail:'Saved addresses could not be loaded'},503):json(page([address]));
 if(p==='/api/notifications/preferences/')return json({id:1,user:'7',muted_notification_types:[],muted_channels:[],email_enabled:true,sms_enabled:false,push_enabled:false,in_app_enabled:true,created_at:date,updated_at:date});
 if(p==='/api/notifications/unread-count/')return json({unread_count:3});
 if(p==='/api/notifications/')return json(page([]));
 if(p==='/api/auth/seller/dashboard/'||p==='/api/auth/seller/status/')return json({id:1,user:seller,store_name:'Fieldwork Studio',store_slug:'fieldwork-studio',logo:null,banner:null,description:'Thoughtful goods for everyday life.',status:'approved',verified_at:date,business_phone:'+49 151 23456789',business_email:'studio@example.test',website:'https://example.test',commission_rate:'8.00',total_sales:'28450.00',total_orders:184,balance:'2480.00',applied_at:date,created_at:date});
 if(p==='/api/rbac/console/overview/')return json(overview);
 if(p==='/api/rbac/console/users/')return json(page([{...admin,is_active:true,date_joined:date,roles:[{id:1,name:'Platform administrator'}]}]));
 if(p==='/api/rbac/console/role-catalog/')return json({roles:[{id:1,name:'Platform administrator',description:'Platform operations',level:100,is_system_role:true,permissions:[],permissions_count:12}],permissions:[]});
 if(p==='/api/rbac/admin-logs/')return json(page([{id:1,action:'product_approved',admin_email:admin.email,target_user_email:null,target_role_name:null,details:{product_id:123},created_at:date}]));
 unmocked.push(p);return json({detail:`Unmocked isolated visual audit: ${p}`},503);
 });
 return {requests,unmocked};
}

module.exports={installMocks,products,detail};
