
import sys
import urllib
import urllib2
import httplib
import urlparse
import time
import datetime
import re
import logging

try:
    import simplejson as json
except ImportError:
    import json

from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError, connection, transaction


import numpy as np

import powerdb2.settings as settings
from errors import InvalidStreamException

class Subscription(models.Model):
    owner = models.ForeignKey(User)
    backend_id = models.IntegerField()
    description = models.CharField(max_length=100)
    public = models.BooleanField(default=True)

    def __unicode__(self):
        return self.description
