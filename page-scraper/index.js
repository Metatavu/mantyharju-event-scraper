/*jshint esversion: 6 */

(function() {
  'use strict';

  const fs = require('fs');
  const Promise = require('bluebird');
  const cheerio = require('cheerio');
  const request = require('request');
  const winston = require('winston');
  const util = require('util');
  const moment = require('moment');
  const _ = require('lodash');
  const entities = new require('html-entities').AllHtmlEntities;

  class PageScraper {
    
    scapePage(url) {
      return new Promise((resolve, reject) => {
        
        this.getParsedHtml({ url: url })
          .then(($) => {
            const items = $('.item-page').find('hr');
            const events = [];
            for (let i = 0; i < items.length; i++) {
              let eventTitlePartsOriginal = entities.decode($(items[i]).nextUntil('hr', 'h2').first().html())
              let eventTitleParts = eventTitlePartsOriginal.split('<br>');
              let eventTitle = eventTitleParts[0] ? eventTitleParts[0].replace(/<(?:.|\n)*?>/gm, '') : null;
              let eventDate = eventTitleParts[1] ? eventTitleParts[1].replace(/<(?:.|\n)*?>/gm, '') : null;
              let eventMoment = eventDate ? moment(eventDate, ['D.M.', 'D.M.YYYY'], 'fi').year(new Date().getFullYear()) : null;
              
              if(!eventMoment) {
                continue;
              }
              
              if (!eventMoment.isValid()) {
                winston.log('info', 'invalid date: '+ eventDate + ', trying to fix it');
                eventDate = eventDate.replace(/[0-9].\.-/g, ' ');
                eventMoment =  moment(eventDate, ['D.M.', 'D.M.YYYY'], 'fi').year(new Date().getFullYear())
                if (!eventMoment.isValid()) {
                   winston.log('warn', 'Failed to fix date'); 
                } else {
                  winston.log('info', 'Successfully fixed date'); 
                }
              }

              let eventDescription = '';
              $(items[i]).nextUntil('hr', 'p').each((index, text) => {
                eventDescription += $(text).html($(text).html().replace(/<br\s*[\/]?>/gi, '\n')).text() + '\n';
              });
              
              if (eventTitle) {
                events.push({
                  title: util.format('%s %s', eventTitle, eventDate),
                  start: eventMoment ? eventMoment.isValid() ? eventMoment.toISOString() : null : null,
                  description: eventDescription
                }); 
              }
            }
            
            resolve(events);
          })
          .catch(reject);
      });
      
    }
    
    getParsedHtml(options) {
      return new Promise((resolve, reject) => {
        this.doRequest(options)
          .then((body) => {
            resolve(cheerio.load(body));   
          })
          .catch(reject);     
      });
    }
    
    doRequest(options) {
      return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
          if (error) {
            reject(error);
          } else {
            resolve(body);
          }
        }); 
      });
    }
  }
  
  module.exports = PageScraper;
           
}).call(this);