'use strict';

const winston = require('winston');
const cronJob = require('cron').CronJob;

const meta = require('../meta');

const jobs = {};

module.exports = function (User) {
	User.startJobs = function () {
		winston.verbose('[user/jobs] (Re-)starting jobs...');

		let started = 0;
		let { digestHour } = meta.config;

		// Fix digest hour if invalid
		if (isNaN(digestHour)) {
			digestHour = 17;
		} else if (digestHour > 23 || digestHour < 0) {
			digestHour = 0;
		}

		User.stopJobs();

		startDigestJob('digest.daily', `0 ${digestHour} * * *`, 'day');
		startDigestJob('digest.weekly', `0 ${digestHour} * * 0`, 'week');
		startDigestJob('digest.monthly', `0 ${digestHour} 1 * *`, 'month');
		started += 3;

		jobs['reset.clean'] = new cronJob('0 0 * * *', User.reset.clean, null, true);
		winston.verbose('[user/jobs] Starting job (reset.clean)');
		started += 1;

		winston.verbose(`[user/jobs] ${started} jobs started`);
	};

	function startDigestJob(name, cronString, term) {
		jobs[name] = new cronJob(cronString, (() => {
			winston.verbose(`[user/jobs] Digest job (${name}) started.`);
			User.digest.execute({ interval: term });
		}), null, true);
		winston.verbose(`[user/jobs] Starting job (${name})`);
	}

	User.stopJobs = function () {
		let terminated = 0;
		// Terminate any active cron jobs
		for (const jobId of Object.keys(jobs)) {
			winston.verbose(`[user/jobs] Terminating job (${jobId})`);
			jobs[jobId].stop();
			delete jobs[jobId];
			terminated += 1;
		}
		if (terminated > 0) {
			winston.verbose(`[user/jobs] ${terminated} jobs terminated`);
		}
	};
};
