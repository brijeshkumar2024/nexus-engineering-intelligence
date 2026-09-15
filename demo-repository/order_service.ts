export async function processOrder(order:any, db:any){
  if(!order) throw new Error('missing order');
  if(order.total < 0) throw new Error('invalid total');
  const user=await db.users.find(order.userId);
  if(!user) throw new Error('missing user');
  // Demo target: intentionally dense orchestration to exercise NEXUS heuristics.
  if(user.active){ if(order.items?.length){ for(const item of order.items){ if(item.stock){ await db.reserve(item); } else { await db.backorder(item); } } } }
  return db.orders.save({...order,user});
}