import RodRequest from './rodRequest';
import _ from 'lodash';
import MersenneTwister from 'mersenne-twister';
const mt = new MersenneTwister();

class Roll {

	errors: string[] = [];
	text: string;
	result: string|number;
	pretty: string[];
	raw: string;
	parts: string[];
	expressions: string[];
	title: string;
	multi?: Roll[];

	constructor( data: any = null ) {
		const self = this;

		if (data) {
			data = _.filter(data, function(m) { return typeof m == 'function'; }); // dont' want to pull in mongoose methods by accident
			Object.assign( self, data );
		}
	}

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
			try {
				m = m.replace(new RegExp('^(?:\\' + req.esc + 'r(?:oll)?)?(?:\\s)?' + r.name + '\\b', 'gi'), r.roll);
			} catch(e) {
				self.errors.push('Something about your saved macro: `' + r.name +'` caused an error. We\'ll try to prevent these things from being created in the future, but for now, please remove it.');
			}
		});

		// does this contain a negative check? 'c-5' => 1d20 - 5
		m = m.replace(/c-([0-9]+)([ad])?/g, function (m, p1, m1) {
			//console.log(m, p1, m1);
			return '1d20' + (m1 || '') + ' - ' + p1;
		});

		// does this contain a check? 'c5' => 1d20 + 5
		m = m.replace(/c([0-9]+)([ad])?/g, function (m, p1, m1) {
			//console.log(m, p1, m1);
			return '1d20' + (m1 || '') + ' + ' + p1;
		});

		// does this contain shorthand? '4a:6:1' => 1d20a + 4; 1d6 + 1
		m = m.replace(/([-0-9]+)([ade])?:([0-9.]+)(?:[:])?([-0-9]+)?/g, function (m, p1, m1, p2, p3) {
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
		const rolls = m.split(/[,;]/);
		if (rolls.length > 1) {
			const sep = m.match(/([,;])/)[0];
			const rs = _.map(rolls, function (r) {
				return Roll.parseRoll(req, r);
			});

			const combined = _.map(rs, function (r) {
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
		m = m.replace(/-/g, ' - ');
		m = m.replace(/x/g, '*');
		m = m.replace(/\*/g, ' * ');
		//m = m.replace(/\//g, ' / ');
		m = m.replace(/\(/g, ' ( ');
		m = m.replace(/\)/g, ' ) ');
		m = m.replace(/ {2}/g, ' '); // extra spaces

		let parts = m.trim().split(' ');
		parts = _.filter(parts, function (p) { return !(p.startsWith(req.esc) && p != req.esc); }); // remove the command
		//console.log('- parts', parts);

		const total = 0;
		const pretty = [];
		const expressions = [];
		let error = null;
		let d = null;
		_.each(parts, function (p) {
			// eslint-disable-next-line no-cond-assign
			if (d = p.match(/([1-9]\d*)?[dDfFwW]([1-9fF]\d*)?([aAdDkKlLter+])?([0-9=<>]*)?/)) { // dice
				let count = d[1] ? parseInt(d[1]) : 1;
				const fate = p.match(/[fF]/);
				const wod = p.match(/[wW]/);
				let die = d[2] ? parseInt(d[2]) : 20;
				const adv = d[3] && d[3].toLowerCase().indexOf('a') != -1;
				const dis = d[3] && d[3].toLowerCase().indexOf('d') != -1;
				const keep = d[3] && d[3].toLowerCase().indexOf('k') != -1 ? d[4] || 1 : false;
				const lose = d[3] && d[3].toLowerCase().indexOf('l') != -1 ? d[4] || 1 : false;
				let explode = d[3] && d[3].toLowerCase().indexOf('e') != -1 ? d[4] || die : false;
				const mod = d[3] && d[3].toLowerCase().indexOf('+') != -1 ? d[4] || 1 : false;

				// world of darkness rolling is weird enough that we'll break here and handle separately
				if (wod) { 
					const wroll = self.WodRoll(p);
					pretty.push('(' + wroll.ex.join(' ') + ')');
					expressions.push( wroll.success );
					return;
				}

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
					if (explode && Roll.explodeCheck(r, explode)) r = '__**' + r + '**__';
					if (r == 20 && die == 20) r = '__**20**__';
					ex.push(r);
				}

				if (adv || dis) {
					//console.log('- advantage or disadvantage detected');
					const ex2 = [];
					for (let i = 0; i < count; i++) {
						ex2.push(1 + Math.floor(mt.random() * die));
					}

					const exs: any = Roll.mathString(ex.join('+'));
					const ex2s: any = Roll.mathString(ex2.join('+'));
					const g = Math.max(exs, ex2s);
					const l = Math.min(exs, ex2s);
					const final = adv ? g : l;
					const dir = adv ? '>' : '<';
					let first: any = adv ? g : l;
					if (first == 20 && die == 20) first = '__**20**__';
					const last = adv ? l : g;

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

					const newEx = [];
					const newPretty = [];
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

					const newEx = [];
					const newPretty = [];
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
					if (die == 1) {
						self.errors.push( 'exploding on a d1 creates a black hole, and your character dies.' );
						return;
					}

					console.log('- explode found:', {ex, die, explode});

					

					let total = 0;
					let explodes = _.filter(ex, c => Roll.explodeCheck(c, explode)).length;
					while (explodes) {
						total++;
						if (total > 50) {
							self.errors.push( 'Infinite explode loop. Either your character dies or the person they hit did.' );
							break; // let's not get caught in an infinite loop
						}
						explodes--;
						const r = 1 + Math.floor(mt.random() * die);

						if (Roll.explodeCheck(r, explode)) {
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

				const expression = (ex.length > 1 ? '(' : '') + ex.join('+') + (ex.length > 1 ? ')' : '');
				expressions.push(expression);
				pretty.push(expression);
			} else
				if (p.match(/[0-9?:><=+\-*/()]/)) {
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
	 * Parses a World of Darkness roll. It's different enough from the regular D&D die system that trying to mix them got really dirty
	 * @param roll - the wod roll: `10w5te8`
	 * @return the results object
	 */
	public WodRoll( roll: string) : {ex: string[], success: number} {
		const self = this;
		// re-parse the roll string
		const d = roll.match(/([1-9]\d*)?[wW]([1-9]\d*)?([tde0-9=<>]*)?/);
		//console.log('- wod roll:', roll, 'parsed:', d);
		let count = d[1] ? parseInt(d[1]) : 1;
		let die = d[2] ? parseInt(d[2]) : 5;
		let tripleM = roll.match(/w.*?t([0-9<>=]*)/);
		let triple: any = tripleM ? tripleM[1] || 10 : 0;
		let doubleM = roll.match(/w.*?d([0-9<>=]*)/);
		let double: any = doubleM ? doubleM[1] || 10 : 0;
		let explodeM = roll.match(/w.*?e([0-9<>=]*)/);
		let explode: any = explodeM ? explodeM[1] || 10 : 0;
		//console.log('- explode match:', explodeM);

		let ex = [];
		let success = 0;
		let explodes = 0;
		const check = die || 5;
		//console.log('- wod roll:', {count, check, explode, double, triple});
		for (let i = 0; i < count; i++) {
			let rnum: any = 1 + Math.floor(mt.random() * 10);
			let r = rnum;
			if (rnum >= check) {
				success++;
				r = '**' + r + '**';
			}
			if (rnum == 1) {
				success--;
				r = '~~' + r + '~~';
			}
					
			if (explode && Roll.explodeCheck(rnum, explode)) {
				r = '__' + r + '__';
				count++;
				explodes++;
				if (explodes >= 10 * count) {
					self.errors.push('Infinite explode loop. Either your character dies or the person they hit did.');
					return;
				}
			}

			if (triple && Roll.explodeCheck(rnum, triple)) {
				r = r + '^^';
				success += 2;
			} else
			if (double && Roll.explodeCheck(rnum, double)) {
				r = r + '^';
				success++;
			}

			ex.push(r);
		}

		return {ex, success};
	}

	/**
	 * Checks to see if a roll should explode based on the explode string
	 * @param r - the roll to check
	 * @param explode - the explode string sent
	 * @return whether or not to explode
	 */
	static explodeCheck(c: any, explode: any) {
		if (!isNaN(explode)) { // it's a number
			return parseInt(('' + c).replace(/[_*~^]/g, '')) >= parseInt(explode);
		} else {
			return Roll.mathString(('' + c).replace(/[_*~^]/g, '') + explode, true);
		}
	}

	/**
	 * Evaluates the string as basic math
	 * @param s - the math to be evaluated
	 * @return the evaluation
	 */
	static mathString(s: string, noErrors:boolean = false): number|string {
		s = s.replace(/__\*\*([0-9]+)\*\*__/g, '$1');
		if (s.match(/[^0-9?:><=+\-*/() ]/)) {
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

export default Roll;