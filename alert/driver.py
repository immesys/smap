"""
Copyright (c) 2011, 2012, Regents of the University of California
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions 
are met:

 - Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
 - Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the
   distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS 
FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL 
THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES 
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) 
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, 
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
OF THE POSSIBILITY OF SUCH DAMAGE.
"""

import operator
from twisted.enterprise import adbapi
from twisted.internet import defer, threads, reactor
import twisted.web
import datetime
import traceback

from smap import driver, actuate
from smap.archiver.client import RepublishClient, SmapClient
from smap.contrib.client import StringConsumer

from powerdb2.alert import models

def get_testfn(cmpfn, thresh):
    def testfn(val):
        return cmpfn(val, thresh)
    return testfn

class AlertDriver(driver.SmapDriver):
    class UpdateActuator(actuate.IntegerActuator):
        def get_state(self, request):
            return 0
        def set_state(self, request, state):
            # reload an alert on a set request
            reactor.callLater(0.5, self.driver.poll_alert, state)
            return state

    def setup(self, opts):
        self.opts = {}
        for k, v in opts.iteritems(): self.opts[k.lower()] = v
        self.filters = {}
        a = self.add_actuator('/update', '', AlertDriver.UpdateActuator)
        a.driver = self

    def start(self):
        self.poll_alerts()

    def poll_alerts(self):
        d = threads.deferToThread(lambda: models.Alert.objects.filter(enabled=True))
        d.addCallback(self._check_alerts)


    def poll_alert(self, id):
        d = threads.deferToThread(lambda: models.Alert.objects.filter(enabled=True,
                                                                      id=id))
        d.addCallback(self._check_alerts, id)


    # run in thread
    def _save_level(self, id, level):
        a = models.Alert.objects.get(id=id)
        a.current_level = models.Level.objects.get(priority=level)
        a.silent = False        # unsilence on a level change
        a.last_change = datetime.datetime.now()
        a.save()

    def _save_error(self, error, id):
        a = models.Alert.objects.get(id=id)
        a.error_state = False
        a.error = error.getvalue()
        a.error_time = datetime.datetime.now()
        a.save()

    def _save_check_time(self, id):
        a = models.Alert.objects.get(id=id)
        a.last_check = datetime.datetime.now()
        a.save()

    def _clear_error(self, a):
        a.error_state = True
        a.error = ""
        a.error_time = None
        a.save()

    def _add_alert_error(self, error, id):
        threads.deferToThread(self._save_error, error, id)

    def _check_alert_error(self, id, response):
        finished = defer.Deferred()
        response.deliverBody(StringConsumer(finished))
        finished.addCallback(self._add_alert_error, id)
        return finished

    def _check_alerts(self, alerts, requested_id=None):
        """Check to make sure we are sync'ed up with the database
        about which alerts we should be computing"""
        for a in alerts:
            self._clear_error(a)
            if not a.id in self.filters:
                self.filters[a.id] = {'pending' : {},
                                      'states' : {}
                                      }
            else:
                # if the query changed, reconnect with a new query
                if a.select != self.filters[a.id]['select']:
                    self.filters[a.id]['client'].close()
                    del self.filters[a.id]['client']
                    self.filgers[a.id] = {'pending': {},
                                          'states': {}}
                                          
            if a.id == requested_id:
                requested_id = None

            # update our comparators
            self.filters[a.id]['test'] = a.get_test()
            self.filters[a.id]['select'] = a.select
            self.filters[a.id]['current_level'] = a.current_level

            if not 'client' in self.filters[a.id]:
                def make_cbs():
                    id_ = a.id
                    def rxfn(data):
                        return self.data(id_, data)
                    def erfn(data):
                        return self._check_alert_error(id_, data)
                    return rxfn, erfn
                cb, eb = make_cbs()
                self.filters[a.id]['client'] = RepublishClient('http://ar1.openbms.org:8079/',
                         cb, restrict=a.select, connect_error=eb)
                self.filters[a.id]['client'].connect()

            # note that we poked this alert
            threads.deferToThread(self._save_check_time, a.id)

        if requested_id != None and requested_id in self.filters:
            # disable any ids that were requested but might have been
            # deleted or disabled.
            print "Disabling", requested_id
            self.filters[requested_id]['client'].close()
            del self.filters[requested_id]

    def data(self, id, values):
        """Callback for data coming into the alert system from the republished.
        
        Check if the alert state has changed, and if it is build a
        list of new pending alerts and send a message.
        """
        for v in values.itervalues():
            if not 'Readings' in v: continue
            if not 'uuid' in v: continue
            streamid = v['uuid']
            for dp in v['Readings']:
                test_result = self.filters[id]['test'](dp[1])
                prio = test_result[0].priority

                # if no action is define, skip the rest of the checks

                if not streamid in self.filters[id]['states'] or \
                        self.filters[id]['states'][streamid] != prio:
                    # level change
                    if test_result[1] and \
                            ((not streamid in self.filters[id]['pending']) or \
                                 self.filters[id]['pending'][streamid]['priority'] < prio):
                        # enqueue a notification if we're more important or there isn't one already
                        self.filters[id]['pending'][streamid] = {
                            'priority': prio,
                            'time': dp[0],
                            'value': dp[1],
                            'check': test_result[1],
                            }
                        
                    self.filters[id]['states'][streamid] = prio
                    print self.filters[id]['pending']

        # find the new max alert level?
        cur_prio = max(self.filters[id]['states'].values())
        if cur_prio != self.filters[id]['current_level']:
            self.filters[id]['current_level'] = cur_prio
            threads.deferToThread(self._save_level, id, cur_prio)

        if len(self.filters[id]['pending']):
            threads.deferToThread(self.generate_alert, id)

    def generate_alert(self, id):
        """Actually generate an alert, if we're not rate-limited.
        If we are rate-limited, just queue the alert."""
        print "generate alert", id
        try:
            a = models.Alert.objects.get(id=id)
        except models.Alert.DoesNotExist:
            print "Alert", id, "disappeared!"
            return

        if a.silent:
            print "Alert", id, "is silent"
            return

        try:
            notify_prio = max(map(operator.itemgetter('priority'),
                                  self.filters[id]['pending'].values()))
            # check rate limit
            if a.last_notification == None or \
                    (a.last_notification + 
                     datetime.timedelta(seconds=a.notification_frequency) < 
                     datetime.datetime.now()) or \
                     notify_prio > a.last_priority:
                # notify if we're not rate limited, or the alert level has increased.
                print "send notification", notify_prio

                # find the checks at the max prio
                checks = [x['check'] for x in self.filters[id]['pending'].itervalues()
                          if x['priority'] == notify_prio]

                for check_id in checks:
                    try:
                        # look them up
                        check_inst = models.Check.objects.get(id=check_id)
                    except models.Check.DoesNotExist:
                        print "Check disappeared", check_id
                        continue
                    
                    # is anyone listening?
                    if not check_inst.recipients: continue
                    recipients = check_inst.recipients.emails()

                    # find the data for this alert message
                    streams = dict([(k, v) for (k,v) in self.filters[id]['pending'].iteritems()
                                    if x['check'] == check_id])

                    check_inst.action.send_alert(recipients, a, streams, check_inst.level.description)

                # sending a message flushes all pending lower-priority alerts
                self.filters[id]['pending'] = {}                
                a.last_notification = datetime.datetime.now()
                a.last_priority = models.Level.objects.get(priority=notify_prio)
                a.save()
                
        except Exception, e:
            print "logging exception in alert send:", e
            traceback.print_exc()
            a.error_state = False
            a.error = "Encountered exception processing template: " + str(e)
            a.error_time = datetime.datetime.now()
            a.save()


if __name__ == '__main__':
    a = models.Alert.objects.get(id=1)
    t = a.get_test()
    vals = [0, 5, 10, 15, 20, 25]
    for v in vals:
        print v, t(v)
