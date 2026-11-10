// Costruisce il sito in _site/: copia index.html e genera i PDF in italiano e in inglese.
// Prima di stampare controlla che le traduzioni siano complete e che il testo italiano scritto
// nell'HTML coincida con I18N.it: se qualcosa non torna si ferma, e non si pubblica niente.
//
//   npm run pdf                       (usa il Chrome installato; CHROME_PATH per indicarne un altro)

import { copyFile, mkdir, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const OUT = resolve('_site');
const PAGE = resolve(OUT, 'index.html');
const PDF = { it: 'CV_Mario_Monterisi.pdf', en: 'CV_Mario_Monterisi_EN.pdf' };
const MAX_PAGINE = 2;

function trovaChrome() {
  const candidati = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const trovato = candidati.find((p) => existsSync(p));
  if (!trovato) throw new Error('Chrome non trovato: indica il percorso con CHROME_PATH');
  return trovato;
}

// Ritorna gli errori di traduzione; la pagina va aperta in italiano, quindi col testo scritto nell'HTML.
async function controllaTraduzioni(page) {
  return page.evaluate(() => {
    const errori = [];
    const { it, en } = window.I18N;
    for (const k of Object.keys(it)) if (!(k in en)) errori.push(`manca l'inglese di «${k}»`);
    for (const k of Object.keys(en)) if (!(k in it)) errori.push(`manca l'italiano di «${k}»`);
    for (const [lingua, d] of Object.entries({ it, en })) {
      for (const [k, v] of Object.entries(d)) if (!String(v).trim()) errori.push(`«${k}» vuoto in ${lingua}`);
    }
    // Il testo nell'HTML deve essere lo stesso di I18N.it: lo si confronta dopo averlo fatto
    // serializzare al browser, così entità e virgolette non danno falsi allarmi.
    const norma = (html) => { const t = document.createElement('template'); t.innerHTML = html; return t.innerHTML.trim(); };
    for (const el of document.querySelectorAll('[data-i18n]')) {
      const k = el.getAttribute('data-i18n');
      if (!(k in it)) { errori.push(`«${k}» è nell'HTML ma non in I18N`); continue; }
      if (norma(el.innerHTML) !== norma(it[k])) {
        errori.push(`«${k}»: il testo nell'HTML è diverso da I18N.it\n    HTML: ${el.innerHTML.trim()}\n    I18N: ${it[k]}`);
      }
    }
    return errori;
  });
}

function contaPagine(file) {
  return (readFileSync(file, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await copyFile('index.html', PAGE);

const browser = await puppeteer.launch({ executablePath: trovaChrome(), args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  for (const lingua of ['it', 'en']) {
    const url = `${pathToFileURL(PAGE).href}?lang=${lingua}`;
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);

    if (lingua === 'it') {
      const errori = await controllaTraduzioni(page);
      if (errori.length) {
        console.error(`Traduzioni da sistemare (${errori.length}):\n- ${errori.join('\n- ')}`);
        process.exitCode = 1;
        break;
      }
    }

    const file = resolve(OUT, PDF[lingua]);
    await page.pdf({ path: file, printBackground: true, preferCSSPageSize: true });
    const pagine = contaPagine(file);
    console.log(`${PDF[lingua]}: ${pagine} pagine`);
    if (pagine > MAX_PAGINE) console.warn(`  attenzione: più di ${MAX_PAGINE} pagine`);
  }
} finally {
  await browser.close();
}
