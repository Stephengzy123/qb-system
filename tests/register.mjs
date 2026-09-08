import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
registerHooks({resolve(specifier,context,next) {
  if(specifier === '@/lib/app-user' && (context.parentURL?.includes('/work/route.ts') || context.parentURL?.includes('/api/admin/students/') || context.parentURL?.endsWith('/lib/learning.ts'))) return next(pathToFileURL(path.resolve('tests/learning-test-auth.mjs')).href,context);
  if(specifier === '@/lib/app-user' && (context.parentURL?.includes('/api/assignments/') || context.parentURL?.includes('/api/error-practice/'))) return next(pathToFileURL(path.resolve('tests/assignment-test-auth.mjs')).href,context);
  if(specifier === '@/lib/app-user' && context.parentURL?.includes('/api/question-sets/')) return next(pathToFileURL(path.resolve('tests/answer-test-auth.mjs')).href,context);
  if(specifier.startsWith('@/')) return next(pathToFileURL(path.resolve('src',specifier.slice(2)+'.ts')).href,context);
  return next(specifier,context);
}});
