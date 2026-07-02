import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('dist/index.html', 'utf-8');
const dom = new JSDOM(html);
const el = dom.window.document.querySelector("div#root:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(2)");
console.log(el ? el.outerHTML : "Element not found");
