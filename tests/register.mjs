import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
registerHooks({resolve(specifier,context,next) {
  if(specifier.startsWith('@/')) return next(pathToFileURL(path.resolve('src',specifier.slice(2)+'.ts')).href,context);
  return next(specifier,context);
}});
