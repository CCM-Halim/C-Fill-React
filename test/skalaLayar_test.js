import test from 'node:test';
import assert from 'node:assert/strict';
import { hitungSkala } from '../src/lib/skalaLayar.js';

test('ponsel & area sempit tidak diperbesar', () => {
  assert.equal(hitungSkala(380, 390), 1);
  assert.equal(hitungSkala(1500, 800), 1);       // viewport sempit -> tata letak ponsel
  assert.equal(hitungSkala(900, 1024), 1);       // di bawah lebar dasar
  assert.equal(hitungSkala(NaN, 1920), 1);
});
test('monitor lebar diperbesar proporsional, dibatasi 2.2', () => {
  assert.equal(hitungSkala(1180, 1366), 1);
  assert.equal(hitungSkala(1590, 1920), 1.35);
  assert.equal(hitungSkala(2360, 2560), 2);
  assert.equal(hitungSkala(5000, 3840), 2.2);
});
