import RodRequest from './rodRequest';
import _ from 'lodash';
import MersenneTwister from 'mersenne-twister';
const mt = new MersenneTwister();

class Roll {

	errors: string[] = [];
	text: string;
	result: string;
	pretty: string[];
	raw: string;
	parts: string[];
	expressions: string[];
	title: string;
	multi?: Roll[];

	/**
	 * Parses a roll string, under the context of the requesting user/server for macros etc.
	 * @param req - the request object
	 * @param m - the roll string to parse
	 * @return the roll object
	 */
	static parseRoll(req: RodRequest, m: string): Roll {
		const self = new Roll();

		// is this an ability roll?
		if (m.indexOf('abilities') != -1) {
			m = '4d6k3;4d6k3;4d6k3;4d6k3;4d6k3;4d6k3';
		}

		// does this have any iterations? (part 1)
		m = m.replace(/\[([0-9]+)\](.*?)(;.*)?$/, function (m, i, p1, r) {
			i = parseInt(i);
			if (i > 20) {
				i = 20;
				self.errors.push('Too many iterations: used 20 instead.');
			}
			let a = Array(i).fill(p1.trim(), 0, i);
			a = _.map(a, function (s, ii) {
				return s.replace('{i}', ii + 1);
			});
			return a.join(';') + (r || '');
		});

		// is this a roll macro?
		_.each(req.user.settings.macros || [], function (r) {
			if (!r.name || !r.roll) return;
			m = m.replace(new RegExp('^(?:\\' + req.server.esc + 'r(?:oll)?)?(?:\\s)?' + r.name + '\\b', 'gi'), r.roll);
		});

		// does this contain a negative check? 'c-5' => 1d20 - 5
		m = m.replace(/c\-([0-9]+)([ad])?/g, function (m, p1, m1) {
			//console.log(m, p1, m1);
			return '1d20' + (m1 || '') + ' - ' + p1;
		});

		// does this contain a check? 'c5' => 1d20 + 5
		m = m.replace(/c([0-9]+)([ad])?/g, function (m, p1, m1) {
			//console.log(m, p1, m1);
			return '1d20' + (m1 || '') + ' + ' + p1;
		});

		// does this contain shorthand? '4a:6:1' => 1d20a + 4; 1d6 + 1
		m = m.replace(/([\-0-9]+)([ade])?:([0-9\.]+)(?:[:])?([\-0-9]+)?/g, function (m, p1, m1, p2, p3) {
			return '1d20' + (m1 || '') + (parseInt(p1) > 0 ? ' + ' : '') + p1 + ' # hit; ' + (p2.indexOf('.') != -1 ? p2.replace('.', 'd') : '1d' + p2) + (parseInt(p3) ? (parseInt(p3) > 0 ? ' + ' : '') + p3 : '') + ' # dmg';
		});

		// does this have any iterations? (part 2)
		m = m.replace(/\[([0-9]+)\](.*?)(;.*)?$/, function (m, i, p1, r) {
			i = parseInt(i);
			if (i > 20) {
				i = 20;
				self.errors.push( 'Too many iterations: used 20 instead.' );
			}
			let a = Array(i).fill(p1.trim(), 0, i);
			a = _.map(a, function (s, ii) {
				return s.replace('{i}', ii + 1);
			});
			return a.join(';') + (r || '');
		});

		// is this a multiple roll?
		let rolls = m.split(/[,;]/);
		if (rolls.length > 1) {
			let sep = m.match(/([,;])/)[0];
			const rs = _.map(rolls, function (r) {
				return Roll.parseRoll(req, r);
			});

			let combined = _.map(rs, function (r) {
				return r.errors.length ? r.errors.join('; ') : r.text;
			});

			const multiRoll = new Roll();
			multiRoll.multi = rs;
			multiRoll.raw = m;
			multiRoll.text = combined.join(sep == ';' ? '\n' : ', ')
			
			return multiRoll;
		}

		// find title if any
		let title: any = m.match(/#(.*)/);
		if (title) {
			m = m.substr(0, m.indexOf('#'));
			title = title[1];
			//console.log('- title:', title);
			//console.log('- roll minus title:', m);
		}

		// isolate math
		m = m.replace(/\+/g, ' + ');
		m = m.replace(/\-/g, ' - ');
		m = m.replace(/x/g, '*');
		m = m.replace(/\*/g, ' * ');
		//m = m.replace(/\//g, ' / ');
		m = m.replace(/\(/g, ' ( ');
		m = m.replace(/\)/g, ' ) ');
		m = m.replace(/  /g, ' '); // extra spaces

		let parts = m.trim().split(' ');
		parts = _.filter(parts, function (p) { return !(p.startsWith(req.server.esc) && p != req.server.esc); }); // remove the command
		//console.log('- parts', parts);

		let total = 0;
		let pretty = [];
		let expressions = [];
		let error = null;
		let d = null;
		_.each(parts, function (p) {
			if (d = p.match(/([1-9]\d*)?[dDfF]([1-9fF]\d*)?([aAdDkKlLer\+])?([1-9]\d*)?/)) { // dice
				let count = d[1] ? parseInt(d[1]) : 1;
				let fate = p.match(/[fF]/);
				let die = d[2] ? parseInt(d[2]) : 20;
				let adv = d[3] && d[3].toLowerCase().indexOf('a') != -1;
				let dis = d[3] && d[3].toLowerCase().indexOf('d') != -1;
				let keep = d[3] && d[3].toLowerCase().indexOf('k') != -1 ? d[4] || 1 : false;
				let lose = d[3] && d[3].toLowerCase().indexOf('l') != -1 ? d[4] || 1 : false;
				let explode = d[3] && d[3].toLowerCase().indexOf('e') != -1 ? d[4] || die : false;
				let mod = d[3] && d[3].toLowerCase().indexOf('+') != -1 ? d[4] || 1 : false;
				//console.log('- die:', count, die, adv || dis, keep, 'from', d);
				if (fate) {
					die = 3;
				}
				if (!die) {
					error = 'Weird roll.';
					return;
				}
				if (die > 1000 || count > 100) {
					error = 'Congrats, you found my upper limits!';
					return;
				}

				let ex = [];
				for (let i = 0; i < count; i++) {
					let r: any = 1 + Math.floor(mt.random() * die);
					if (fate) r -= 2;
					if (explode && r == die) r = '__**' + r + '**__';
					if (r == 20 && die == 20) r = '__**20**__';
					ex.push(r);
				}

				if (adv || dis) {
					//console.log('- advantage or disadvantage detected');
					let ex2 = [];
					for (let i = 0; i < count; i++) {
						ex2.push(1 + Math.floor(mt.random() * die));
					}

					let exs: any = Roll.mathString(ex.join('+'));
					let ex2s: any = Roll.mathString(ex2.join('+'));
					let g = Math.max(exs, ex2s);
					let l = Math.min(exs, ex2s);
					let final = adv ? g : l;
					let dir = adv ? '>' : '<';
					let first: any = adv ? g : l;
					if (first == 20 && die == 20) first = '__**20**__';
					let last = adv ? l : g;

					pretty.push('(' + first + ' ' + dir + ' ' + last + ')');
					expressions.push(final);
					return;
				}

				if (keep) {
					//console.log('- keep detected:', keep);
					if (keep > count) {
						self.errors.push( 'Keep value is more than die count (' + keep + ' > ' + count + ')' );
						return;
					}

					ex = _.sortBy(ex, function (num) { return -1 * parseInt(('' + num).replace(/[_*]/g, '')); });

					let newEx = [];
					let newPretty = [];
					for (let k = 0; k < ex.length; k++) {
						if (k < keep) {
							newEx.push(ex[k]);
							newPretty.push(ex[k]);
						} else {
							newPretty.push('~~' + ex[k] + '~~');
						}
					}

					pretty.push((newPretty.length > 1 ? '(' : '') + newPretty.join('+') + (newPretty.length > 1 ? ')' : ''));
					expressions.push(newEx.join('+'));
					return;
				}

				if (lose) {
					//console.log('- keep detected:', keep);
					if (lose > count) {
						self.errors.push( 'Keep lower value is more than die count (' + lose + ' > ' + count + ')' );
						return;
					}

					ex = _.sortBy(ex, function (num) { return parseInt(num); });

					let newEx = [];
					let newPretty = [];
					for (let k = 0; k < ex.length; k++) {
						if (k < lose) {
							newEx.push(ex[k]);
							newPretty.push(ex[k]);
						} else {
							newPretty.push('~~' + ex[k] + '~~');
						}
					}

					pretty.push((newPretty.length > 1 ? '(' : '') + newPretty.join('+') + (newPretty.length > 1 ? ')' : ''));
					expressions.push(newEx.join('+'));
					return;
				}

				if (explode) {
					if (explode > die) {
						self.errors.push( 'Your explode cannot be greater than the die value.' );
						return;
					}
					if (die == 1) {
						self.errors.push( 'exploding on a d1 creates a black hole, and your character dies.' );
						return;
					}

					let explodes = _.filter(ex, function (c) { return ('' + c).replace(/\_\_\*\*([0-9]+)\*\*\_\_/g, '$1') == explode; }).length;
					while (explodes) {
						explodes--;
						let r = 1 + Math.floor(mt.random() * die);

						if (r == die) {
							explodes++;
							ex.push('__**' + r + '**__');
						} else {
							ex.push(r);
						}
					}
				}

				if (mod) {
					//console.log('- adding mod:', mod);
					ex.push(mod);
				}

				let expression = (ex.length > 1 ? '(' : '') + ex.join('+') + (ex.length > 1 ? ')' : '');
				expressions.push(expression);
				pretty.push(expression);
			} else
				if (p.match(/[0-9+\-\*\/\(\)]/)) {
					expressions.push(p);
					pretty.push(p);
				} else {
					self.errors.push( 'Unrecognized roll expression: ' + p );
				}
		});

		self.raw = m;
		self.expressions = expressions;
		self.parts = parts;
		self.pretty = pretty;
		self.title = title;
		self.text = self.errors.length ? self.errors.join('; ') : self.parts.join(' ') + ' = ' + self.pretty.join(' ') + ' = **' + Roll.mathString(self.expressions.join(' ')) + '**' + (self.title ? ' **`' + self.title.trim() + '`**' : '');
		self.result = Roll.mathString( self.expressions.join(' ') );

		return self;
	}

	/**
	 * Evaluates the string as basic math
	 * @param s - the math to be evaluated
	 * @return the evaluation
	 */
	static mathString(s: string): string {
		s = s.replace(/\_\_\*\*([0-9]+)\*\*\_\_/g, '$1');
		if (s.match(/[^0-9\+\-\*\/\(\) ]/)) {
			return 'Error: non-math `' + s + '`';
		} else {
			try {
				return eval(s);
			} catch (e) {
				return 'Error: non-math `' + s + '`';
			}
		}
    }
}

export default Roll;