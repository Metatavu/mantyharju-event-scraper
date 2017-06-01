/*jshint esversion: 6 */
/* global __dirname, process */

(function() {
  'use strict';
  
  const fs = require('fs');
  const util = require('util');
  const Promise = require('bluebird');
  const moment = require('moment');
  const cheerio = require('cheerio');
  const winston = require('winston');
  const _ = require('lodash');
  const asyncPromises = require('async-promises');
  const options = require(__dirname + '/options');
  const request = require('request');
  const PageScraper = require(__dirname + '/page-scraper');
  
  if (!options.isOk()) {
    options.printUsage();
    process.exitCode = 1;
    return;
  }

  winston.level = 'debug';

  const baseUrl = 'http://mantyharju.fi';
  const outputFolder = options.getOption('output-folder');
  const outputFile = util.format('%s/mantyharju-events.json', outputFolder);

  request(util.format('%s/tapahtumat', baseUrl), (error, response, body) => {
    if (error) {
      winston.log('error', 'Error opening root page', error);
      return;
    }
    
    const $ = cheerio.load(body);
    const links = $('a.active.parent').next('ul').find('a');
    const scrapes = [];
    
    links.each((index, link) => {
      scrapes.push(new PageScraper().scapePage(util.format('%s%s',baseUrl, $(link).attr('href'))));
    });
 
    asyncPromises.parallel(scrapes)
        .then((results) => {
          let events = [];
          results.forEach((result) => {
            if (result) {
              events = events.concat(result);
            }
          });

          fs.writeFileSync(outputFile, JSON.stringify(events));
        })
        .catch((err) => {
          console.error(err);
        });
  });
}).call(this);