// Duyệt source + nhận diện stack. Trung lập: không biết trước bố cục của app nào.
import {readdirSync, readFileSync, existsSync, statSync} from 'node:fs';
import {join, relative, sep, extname} from 'node:path';
import {SKIP_DIRS} from '../secret-scan.mjs';

export const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.dart', '.kt', '.java', '.swift', '.vue', '.svelte']);
const EXTRA_SKIP = new Set(['android', 'ios', 'macos', 'windows', 'linux', 'web-build', '__tests__', '__mocks__', 'vendor', 'patches', 'docs', 'skills', '.vscode']);
const MAX_SIZE = 1024 * 1024;

export const rel = (root, abs) => relative(root, abs).split(sep).join('/');

/** Liệt kê file source (đường dẫn tương đối, dạng posix). Bỏ thư mục native khi app là JS (RN/web). */
export function listSourceFiles(root, {includeNative = false} = {}) {
  const out = [];
  const walk = dir => {
    let entries;
    try {
      entries = readdirSync(dir, {withFileTypes: true});
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
        if (!includeNative && dir === root && EXTRA_SKIP.has(e.name)) continue;
        walk(p);
      } else if (e.isFile() && SOURCE_EXT.has(extname(e.name)) && !/\.(test|spec|d)\.[jt]sx?$/.test(e.name) && statSync(p).size <= MAX_SIZE) {
        out.push(rel(root, p));
      }
    }
  };
  walk(root);
  return out.sort();
}

export const read = (root, file) => readFileSync(join(root, file), 'utf8');

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const STATE_LIBS = {
  '@reduxjs/toolkit': 'redux-toolkit',
  redux: 'redux',
  zustand: 'zustand',
  mobx: 'mobx',
  jotai: 'jotai',
  recoil: 'recoil',
  '@tanstack/react-query': 'tanstack-query',
  'react-query': 'tanstack-query',
  pinia: 'pinia',
  vuex: 'vuex',
  'redux-persist': 'redux-persist',
};
const HTTP_LIBS = {axios: 'axios', ky: 'ky', ofetch: 'ofetch', 'cross-fetch': 'fetch', 'node-fetch': 'fetch', swr: 'swr'};
const DART_STATE = {flutter_riverpod: 'riverpod', riverpod: 'riverpod', flutter_bloc: 'bloc', bloc: 'bloc', provider: 'provider', get: 'getx', mobx: 'mobx'};
const DART_HTTP = {dio: 'dio', http: 'http', retrofit: 'retrofit', chopper: 'chopper'};

/** @returns {{platform: string, language: string, state: string[], http: string[], manifest: string|null}} */
export function detectStack(root) {
  const pkg = readJson(join(root, 'package.json'));
  if (pkg) {
    const deps = {...pkg.dependencies, ...pkg.devDependencies};
    const has = n => n in deps;
    const platform = has('expo') ? 'expo' : has('react-native') ? 'react-native' : has('next') ? 'nextjs' : has('nuxt') ? 'nuxt' : has('vue') ? 'vue' : has('svelte') ? 'svelte' : has('react') ? 'react-web' : 'node';
    return {
      platform,
      language: has('typescript') || existsSync(join(root, 'tsconfig.json')) ? 'typescript' : 'javascript',
      state: Object.entries(STATE_LIBS).filter(([n]) => has(n)).map(([, v]) => v),
      http: [...new Set(Object.entries(HTTP_LIBS).filter(([n]) => has(n)).map(([, v]) => v))],
      manifest: 'package.json',
    };
  }
  if (existsSync(join(root, 'pubspec.yaml'))) {
    const y = readFileSync(join(root, 'pubspec.yaml'), 'utf8');
    const has = n => new RegExp(`^\\s+${n}:`, 'm').test(y);
    return {
      platform: 'flutter',
      language: 'dart',
      state: [...new Set(Object.entries(DART_STATE).filter(([n]) => has(n)).map(([, v]) => v))],
      http: Object.entries(DART_HTTP).filter(([n]) => has(n)).map(([, v]) => v),
      manifest: 'pubspec.yaml',
    };
  }
  for (const g of ['build.gradle.kts', 'build.gradle', 'app/build.gradle.kts', 'app/build.gradle']) {
    if (existsSync(join(root, g))) {
      const t = readFileSync(join(root, g), 'utf8');
      return {
        platform: 'android',
        language: 'kotlin',
        state: [/compose/i.test(t) && 'compose-state', /lifecycle-viewmodel/.test(t) && 'viewmodel'].filter(Boolean),
        http: [/retrofit/.test(t) && 'retrofit', /okhttp/.test(t) && 'okhttp', /ktor/.test(t) && 'ktor'].filter(Boolean),
        manifest: g,
      };
    }
  }
  if (existsSync(join(root, 'Package.swift')) || readdirSafe(root).some(n => n.endsWith('.xcodeproj'))) {
    return {platform: 'ios', language: 'swift', state: [], http: [], manifest: null};
  }
  return {platform: 'unknown', language: 'unknown', state: [], http: [], manifest: null};
}

function readdirSafe(d) {
  try {
    return readdirSync(d);
  } catch {
    return [];
  }
}
