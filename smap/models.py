# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#     * Rearrange models' order
#     * Make sure each model has one field with primary_key=True
# Feel free to rename the models, but don't rename db_table values or field names.
#
# Also note: You'll have to insert the output of 'django-admin.py sqlcustom [appname]'
# into your database.

import string
import random
import uuid

from django.db import models
from django.contrib.auth.models import User

def new_key():
    return ''.join(map(lambda x: random.choice(string.letters + string.digits),
                       xrange(0, 36)))

def new_uuid():
    return str(uuid.uuid1())

class Subscription(models.Model):
    id = models.AutoField(primary_key=True)
    uuid = models.CharField(max_length=36, default=new_uuid)
    url = models.CharField(max_length=512, default='', blank=True)
    resource = models.CharField(max_length=512, default='/+')
    key = models.CharField(max_length=36, default=new_key)
    public = models.BooleanField(default=True)
    description = models.CharField(max_length=256)
    owner = models.ForeignKey(User)
    class Meta:
        db_table = u'subscription'

    def __unicode__(self):
        if self.description: return self.description
        else: return self.key

class Stream(models.Model):
    id = models.AutoField(primary_key=True)
    subscription = models.ForeignKey(Subscription)
    uuid = models.CharField(unique=True, max_length=36)
    class Meta:
        db_table = u'stream'

class Metadata2(models.Model):
    id = models.AutoField(primary_key=True)
    stream = models.ForeignKey(Stream)
    tagname = models.CharField(max_length=64)
    tagval = models.TextField()
    class Meta:
        db_table = u'metadata2'
