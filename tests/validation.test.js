process.env.LOG_LEVEL = 'silent';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGenerate, validateRender } from '../middlewares/validate.middlewares.js';
import { errorMiddleware } from '../middlewares/error.middlewares.js';

const run = (mw, body) => {
    let error = null;
    const req = { body };
    mw(req, {}, (err) => { error = err || null; });
    return { error, req };
};

test('generate: valid request passes and normalises prompt', () => {
    const { error, req } = run(validateGenerate, { prompt: '  draw a flow  ', engine: 'mermaid', model: 'ignored' });
    assert.equal(error, null);
    assert.deepEqual(req.body.prompt, { text: 'draw a flow', image: undefined });
});

test('generate: missing text, bad engine, too long prompt are 400', () => {
    assert.equal(run(validateGenerate, { prompt: {}, engine: 'mermaid' }).error.statusCode, 400);
    assert.equal(run(validateGenerate, { prompt: { text: 'x' }, engine: 'paint' }).error.statusCode, 400);
    assert.equal(run(validateGenerate, { prompt: { text: 'x'.repeat(4001) }, engine: 'd2' }).error.statusCode, 400);
    assert.equal(run(validateGenerate, { prompt: { text: 'x', image: 5 }, engine: 'd2' }).error.statusCode, 400);
});

test('render: code and engine are required', () => {
    assert.equal(run(validateRender, { code: 'a -> b', engine: 'd2' }).error, null);
    assert.equal(run(validateRender, { engine: 'd2' }).error.statusCode, 400);
    assert.equal(run(validateRender, { code: 'a', engine: 'x' }).error.statusCode, 400);
});

test('error middleware keeps status codes and maps mongoose errors', () => {
    const res = () => {
        const r = { statusCode: null, body: null };
        r.status = (s) => { r.statusCode = s; return r; };
        r.json = (b) => { r.body = b; return r; };
        return r;
    };
    const orig = console.error;
    console.error = () => {};
    try {
        const a = res();
        errorMiddleware(Object.assign(new Error('rate'), { statusCode: 429 }), {}, a, () => {});
        assert.equal(a.statusCode, 429);

        const b = res();
        errorMiddleware(Object.assign(new Error('dup'), { code: 11000 }), {}, b, () => {});
        assert.equal(b.statusCode, 400);
        assert.equal(b.body.error, 'Duplicate field value entered');

        const c = res();
        errorMiddleware(Object.assign(new Error('cast'), { name: 'CastError', path: '_id' }), {}, c, () => {});
        assert.equal(c.statusCode, 404);
    } finally {
        console.error = orig;
    }
});
