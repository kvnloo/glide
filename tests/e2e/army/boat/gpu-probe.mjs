// Bounded Boat-only WebGPU capability probe. No GUI or external inference.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,realpathSync} from 'node:fs';
const server=createServer((req,res)=>res.end('<!doctype html><title>Owned GPU probe</title>'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const results=[];
const base=['--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-webgpu','--enable-unsafe-swiftshader'];
try {
  for(const [name,exe,flags] of [
    ['wrapper-swiftshader','/usr/bin/google-chrome',['--use-angle=swiftshader']],
    ['stock-swiftshader','/opt/google/chrome/chrome',['--use-angle=swiftshader']],
    ['stock-vulkan','/opt/google/chrome/chrome',['--use-angle=vulkan','--enable-features=Vulkan','--ignore-gpu-blocklist']],
    ['stock-vulkan-swiftshader','/opt/google/chrome/chrome',['--use-vulkan=swiftshader','--enable-features=Vulkan','--use-angle=vulkan']],
  ]) {
    let browser;
    const start=Date.now();
    try {
      browser=await chromium.launch({executablePath:exe,headless:true,args:[...base,...flags],timeout:15000});
      const page=await browser.newPage();
      await page.goto('http://127.0.0.1:'+server.address().port);
      const result=await page.evaluate(async()=>{
        const adapter=await navigator.gpu?.requestAdapter();
        if(!adapter)return {adapter:null};
        const info=adapter.info;
        const device=await adapter.requestDevice();
        const buffer=device.createBuffer({size:131072,usage:GPUBufferUsage.VERTEX,mappedAtCreation:true});
        const mapped=buffer.getMappedRange();
        const bytes=mapped.byteLength;
        buffer.unmap();buffer.destroy();device.destroy();
        return {adapter:info,bytes};
      });
      results.push({name,exe,flags,...result,ms:Date.now()-start});
    } catch(error){results.push({name,exe,flags,error:error.message,ms:Date.now()-start});}
    finally{await browser?.close();}
  }
  console.log(JSON.stringify({results,chrome:realpathSync('/usr/bin/google-chrome')},null,2));
} finally{server.close();}
