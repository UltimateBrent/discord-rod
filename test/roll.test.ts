import test from 'node:test';
import assert from 'node:assert/strict';

class Roll {
	static explodeCheck(c: any, explode: any) {
		if (!isNaN(explode)) {
			return parseInt(('' + c).replace(/[_*~^]/g, '')) >= parseInt(explode);
		} else {
			return Roll.mathString(('' + c).replace(/[_*~^]/g, '') + explode, true);
		}
	}

	static mathString(s: string, noErrors: boolean = false): number|string {
		s = s.replace(/__\*\*([0-9\.]+)\*\*__/g, '$1');
		if (s.match(/[^0-9\.?:><=+\-*/() ]/)) {
			if (noErrors) return 0;
			return 'Error: non-math `' + s + '`';
		} else {
			try {
			    return eval(s) as number;
			} catch (e) {
			    if (noErrors) return 0;
			    return 'Error: non-math `' + s + '`';
			}
		}
	}
}

test('mathString evaluates arithmetic', () => {
	assert.equal(Roll.mathString('1 + 2'), 3);
	assert.equal(Roll.mathString('(2 + 3) * 4'), 20);
});

test('explodeCheck with numeric threshold', () => {
	assert.equal(Roll.explodeCheck(6, 6), true);
	assert.equal(Roll.explodeCheck(5, 6), false);
});

test('explodeCheck with expression threshold', () => {
	assert.equal(Roll.explodeCheck(6, '>=6'), true);
	assert.equal(Roll.explodeCheck(5, '>=6'), false);
});
