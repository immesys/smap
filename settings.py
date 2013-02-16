# Django settings for powerdb project.

# SETTINGS FOR EVERYTHING
# SDH : README HERE
# you should be able to do a 'python manage.py runserver' to
# start the development server

import os
import sys

try:
    PROJECT_ROOT
except NameError:
    PROJECT_ROOT = os.path.dirname(__file__)
    sys.path = [os.path.join(PROJECT_ROOT, 'lib')] + sys.path

DEBUG = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    # ('Your Name', 'your_email@domain.com'),
)

MANAGERS = ADMINS

DATABASES = {
    'default' : {
        # 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
        'ENGINE' : 'django_hstore.postgresql_psycopg2',
        'NAME' : 'archiver',             
        # Not used with sqlite3.
        'USER' : 'archiver',
        # Not used with sqlite3.
        'PASSWORD' : 'password',
        # Set to empty string for localhost. Not used with sqlite3.
        'HOST' : 'localhost',
        }
    }

ADMIN_BACKEND = "http://localhost:8070/"

# the ARchiver Daemon is a process which manages the archive of your
# time-series data, and tags.  The Berkeley ARD runs at the location
# below; you can use it if you have an API key; even without it, you
# can query public streams.
ARD_URL = 'http://localhost:8079'

# if you have an API key, put it here.  this will allow you to access
# streams whose data is associated with your key in the backend and
# are marked as private.
# ARD_KEY= 'LdJVVhKssRAnbkvAugbbCZ0HPeSZPrVDb0uW'

# if this is True, then the backend will *only* show you streams which
# are "yours" -- that is, assoicated with your API key.  Otherwise,
# you will also query all "public" streams.
# ARD_PRIVATE = True

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Los_Angeles'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

LOGIN_URL = '/admin/login'

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'cit%=^y%q)2r*!ek0*__j9e7l+$sfd#30gythi$g79ip2-cywv'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    # 'django.template.loaders.filesystem.load_template_source',
    # 'django.template.loaders.app_directories.load_template_source',
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    # '/mnt/md1/django/powerdb/smap/',
    os.path.join(PROJECT_ROOT, 'templates/'),
    os.path.join(PROJECT_ROOT, 'campus/templates'),
)

TEMPLATE_CONTEXT_PROCESSORS = (
    "django.core.context_processors.static",
    "django.contrib.auth.context_processors.auth"    
    )


MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
)

ROOT_NETLOC = 'localhost'
ROOT_URLCONF = 'powerdb2.urls'

# where static files will be copied by "collectstatic"
STATIC_ROOT = os.path.join(PROJECT_ROOT, 'static/')

# the relative URL to serve static files from
STATIC_URL = '/media/'
ADMIN_MEDIA_PREFIX = '/media/admin/'

# # this makes sure our static files will be served in development mode
STATICFILES_DIRS = (
    os.path.join(PROJECT_ROOT, 'media/'),
)

INSTALLED_APPS = (
    'powerdb2.smap',
    'powerdb2.alert',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    
    'revproxy',
)
