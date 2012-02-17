
import uuid
import time
import datetime
import operator
import httplib2

from django.db import models, transaction
from django.db.models import signals
from django.contrib.auth.models import User, Group
from django.template import Template, Context
try:
    from twisted.internet import reactor
    no_twisted = False
except NameError:
    no_twisted = True

from powerdb2 import settings
from smap.archiver.client import SmapClient

import emaillib

comparators = {
    'LT' : operator.__lt__,
    'GT' : operator.__gt__,
    'EQ' : operator.__eq__,
    'NEQ' : operator.__ne__,
    'LTE' : operator.__le__,
    'GTE' : operator.__ge__,
    }

TEST_COMPARATORS = (
    ('GT', '>'),
    ('LT', '<'),
    ('LTE', '<='),
    ('GTE', '>='),
    ('EQ', '='),
    ('NEQ', '!='),
    )
def get_comparator(test, idx=-1):
    for c in TEST_COMPARATORS:
        if c[0] == test.comparator:
            return c[idx]
    return ''

class Test(models.Model):
    """An alert test"""
    value = models.FloatField()
    comparator = models.CharField(max_length=6, 
                                  choices=TEST_COMPARATORS)

    def get_test(self):
        cmp = self.get_comparator()
        val = self.value
        def test(new):
            return cmp(new, val)
        return test

    def get_comparator(self):
        return comparators[self.comparator]

    def __unicode__(self):
        return get_comparator(self, 1) + u' ' + str(self.value)

class Level(models.Model):
    """Alert levels in the future might control who receives a message"""
    description = models.CharField(max_length=16)
    priority = models.IntegerField()

    def __unicode__(self):
        return str(self.priority) + ': ' + self.description

def get_default_level():
    levels = Level.objects.filter(priority=30)
    if len(levels):
        return levels[0]
    else:
        return None

class Action(models.Model):
    """What to do when an alert gets triggered"""
    # when we last did something
    name = models.CharField(max_length=64, unique=True)
    rate = models.IntegerField(default=60, help_text="""
Number of seconds between checking the alert condition""")

    # group to send alert to
    group = models.ForeignKey(Group, null=True, blank=True)

    alert_when_true = models.BooleanField(default=True)
    alert_when_false = models.BooleanField(default=True)

    template = models.TextField(blank=True)

    def __unicode__(self):
        return self.name

    def send_alert(self, alert, setting_uuids, unsetting_uuids, 
                   users=[]):        
        # look up the tags for these streams
        print "SENDING A:ERT"
        uuids = set(setting_uuids.keys() + unsetting_uuids.keys())
        uuids = map(lambda u: "uuid = '%s'" % u, uuids)
        client = SmapClient()
        tags = client.tags(' or '.join(uuids), nest=True)
        tags = dict(((x['uuid'], x) for x in tags))

        def make_context(params):
            rv = []
            for uid, (t, v) in params.iteritems():
                if uid in tags:
                    rv.append(tags[uid])
                    rv[-1]['AlertTime'] = time.ctime(t/1000)
                    rv[-1]['AlertValue'] = v
            return rv
        setting, clearing = make_context(setting_uuids), make_context(unsetting_uuids)
        logentry = Log(alert=alert, 
                       when=datetime.datetime.now())
        logentry.save()

        # generate the text to send, by building a context for our
        # template.
        template = Template(self.template)
        context = Context({
                'setting' :  setting,
                'clearing' : clearing,
                'when_true' : self.alert_when_true,
                'when_false' : self.alert_when_false,
                'permalink' : settings.ROOT_NETLOC + '/admin/alert/log/' + str(logentry.id),
                'alarmpage' : settings.ROOT_NETLOC + '/admin/alert/alert/' + str(alert.id),
                'timestamp' : logentry.when,
                'alarm' : alert.__unicode__(),
                })
        logentry.message = template.render(context)
        logentry.save()

        if self.group != None:
            to = filter(None, map(operator.attrgetter('email'), self.group.user_set.all()))
            emaillib.send(to, 'Alert from %s' % settings.ROOT_NETLOC, logentry.message)
            
def get_default_action():
    poss = Action.objects.filter(name="Default")
    if len(poss) > 0:
        return poss[0]
    else:
        return None

class Alert(models.Model):
    """Represent an alert instance"""
    owner = models.ForeignKey(User)
    description = models.CharField(max_length=512)
    select = models.CharField(max_length=512, help_text="""
The 'where' clause of a query specifying the streams to run on.""")
    enabled = models.BooleanField(default=True)
    level = models.ForeignKey(Level, default=get_default_level, help_text="""
How serious this alert is""")

    test = models.ForeignKey(Test)
    action = models.ForeignKey(Action, default=get_default_action)
    last_action = models.DateTimeField(null=True, help_text="""
The last time we generated an alert for this rule""")

    last_check = models.DateTimeField(null=True, blank=True, help_text="""
The last time the backend processed this alert definition.""")

    # last time the alert was raised
    set = models.NullBooleanField(default=None, null=True, help_text="""
Weather this alert is currently 'set'.""")
    set_time = models.DateTimeField(null=True, blank=True, help_text="""
The last time the alert was set.""")
    clear_time = models.DateTimeField(null=True, blank=True, help_text="""
The last time the alert was cleared.""")

    # if we encountered an error creating the alert
    error = models.TextField(help_text="""
The error encountered.""")
    error_state = models.BooleanField(default=False, help_text="""
Weather the alert is currently active, with no problems.""")
    error_time = models.DateTimeField(null=True, blank=True, help_text="""
When we encountered this error.""")

    def __unicode__(self):
        return '(' + self.select + ") " + self.test.__unicode__()

    def current(self):
        c = SmapClient()
        latest = c.latest(self.select, streamlimit=1000)
        test = self.test.get_test()
        for v in latest:
            if len(v['Readings']):
                v['Set'] = test(v['Readings'][0][1])
        return latest


class Log(models.Model):
    alert = models.ForeignKey(Alert)
    message = models.TextField()
    when = models.DateTimeField()

def ping_backend(sender, instance, **kwargs):
    # HACK ALERT -- we don't want to do this if we're in the
    # backend... but we might be used inside of twisted.
    if no_twisted or not reactor.running:
            # have to commit before we ping otherwise they might read stale data

        try:
            transaction.commit()
        except transaction.TransactionManagementError:
            pass

        try:
            # use this guy's http -- new dep :(
            http = httplib2.Http()
            http.request(settings.ADMIN_BACKEND + 'data/alerts/update?state=%i' % 
                         instance.id, 'PUT')
        except Exception, e: 
            print "Error pong-ing backend:", e

signals.post_save.connect(ping_backend, sender=Alert)
signals.post_delete.connect(ping_backend, sender=Alert)

    
