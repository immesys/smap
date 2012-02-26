
import operator
from twisted.enterprise import adbapi
from twisted.internet import defer, threads
import twisted.web
import datetime

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
            d = threads.deferToThread(lambda: models.Alert.objects.filter(enabled=True,
                                                                          id=state))
            d.addCallback(self.driver._check_alerts, state)
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

    # run in thread
    def _save_level(self, id, level):
        a = models.Alert.objects.get(id=id)
        a.current_level = level
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
            max_level = None
            for dp in v['Readings']:
                test_result = self.filters[id]['test'](dp[1])
                if max_level == None or test_result > max_level:
                    max_level = test_result

                if not streamid in self.filters[id]['states'] or \
                        self.filters[id]['states'][streamid] != test_result.priority:
                    # level change
                    if (not streamid in self.filters[id]['pending'] and test_result.priority > 0) or \
                            (streamid in self.filters[id]['pending'] and \
                                 self.filters[id]['pending'][streamid]['priority'] < test_result.priority):
                        # enqueue a notification if we're more important or there isn't one already
                        self.filters[id]['pending'][streamid] = {
                            'priority': test_result.priority,
                            'time': dp[0],
                            'value': dp[1]
                            }
                    self.filters[id]['states'][streamid] = test_result.priority

            # save a new alert state if we need to
            if max_level != self.filters[id]['current_level']:
                self.filters[id]['current_level'] = max_level
                threads.deferToThread(self._save_level, id, max_level)

#                 if test_value and not v['uuid'] in self.filters[id]['pending_sets'] and \
#                         (not v['uuid'] in self.filters[id]['levels'] or
#                          self.filters[id]['levels'][v['uuid']] == False):
#                     # set the alert if it's now SET and it hasn't already been set
#                     # and it's a level change for this stream
#                     #if v['uuid'] in self.filters[id]['levels']:
#                     self.filters[id]['pending_sets'][v['uuid']] = (dp[0], dp[1])
#                     self.filters[id]['levels'][v['uuid']] = True

#                 elif not test_value and not v['uuid'] in self.filters[id]['pending_clears'] and \
#                         (not v['uuid'] in self.filters[id]['levels'] or
#                          self.filters[id]['levels'][v['uuid']] == True):
#                     # unset the alert
#                     #if v['uuid'] in self.filters[id]['levels']:
#                     self.filters[id]['pending_clears'][v['uuid']] = (dp[0], dp[1]) 
#                     self.filters[id]['levels'][v['uuid']] = False
#             if len(self.filters[id]['pending']):
#                 threads.deferToThread(self.generate_alert, id, 
#                                       self.filters[id]['pending'])
#         # generate the alert in a new thread so we can go crazy blocking
#         if len(self.filters[id]['pending_sets']) or \
#                 len(self.filters[id]['pending_clears']):
#             threads.deferToThread(self.generate_alert, id, 
#                                   dict(self.filters[id]['pending_sets']),
#                                   dict(self.filters[id]['pending_clears']))

    def generate_alert(self, id, pending):
        """Actually generate an alert, if we're not rate-limited.
        If we are rate-limited, just queue the alert."""
        print "generate alert", id
        try:
            a = models.Alert.objects.get(id=id)
        except a.DoesNotExist:
            print "Alert", id, "disappeared!"
            return

        try:
            if len(pending):
                max_prio = max(map(operator.itemgetter('priority'), pending.itervalues()))

                if  (a.last_notification == None or \
                         (datetime.datetime.now() - a.last_notification > \
                              datetime.timedelta(seconds=a.notification_frequency)) or \
                         max_prio > a.last_priority:
                         # a.action.send_alert(a, )
                    self.filters[id]['pending_sets'] = {}
                    self.filters[id]['pending_clears'] = {}
                    a.last_action = datetime.datetime.now()
                    a.save()

        except Exception, e:
            print "logging exception in alert send:", e
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
