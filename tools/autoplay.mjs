import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
const p = await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/index.html');
const ends={};
for(let r=0;r<60;r++){
  for(let i=0;i<300;i++){
    const t=await p.evaluate(()=>{const a=document.getElementById('again');if(a){const h=document.querySelector('.ending h2').textContent;a.click();return 'END:'+h;}
      const cs=[...document.querySelectorAll('.choice')];if(cs.length){cs[Math.floor(Math.random()*cs.length)].click();return 'c';}
      const adv=document.getElementById('adv');if(adv){adv.click();return 'a';}return 'stuck';});
    if(t.startsWith('END')){ends[t]=(ends[t]||0)+1;break;}
    if(t==='stuck'){console.log('STUCK',await p.evaluate(()=>document.getElementById('chapter').textContent));break;}
  }
}
console.log(ends,errs);
await p.screenshot({path:'shot.png',fullPage:true});
await b.close();
