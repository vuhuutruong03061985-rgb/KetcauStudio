from pathlib import Path
p=Path('assets/app.js');s=p.read_text(encoding='utf-8')
s=s.replace("items.push(make(mode,first.x,first.y,p.x,p.y));first=null", "items.push(make(mode,first.x,first.y,p.x,p.y));first={...p};hover=null")
s=s.replace("items.push(o);selected=o.id;first=null;second=null;render();msg('Đã tạo đường cong qua ba điểm. Chọn điểm đầu để vẽ tiếp.');", "items.push(o);selected=o.id;first={...p};second=null;render();msg('Chọn điểm đi qua và điểm cuối để nối tiếp đường cong.');")
pos=s.index('function paintMarquee(){');end=s.rfind('}',0,pos)
s=s[:end]+" if(!clean&&mode==='joint'&&typeof drawJointHandles==='function')drawJointHandles();\n"+s[end:]
p.write_text(s,encoding='utf-8')
