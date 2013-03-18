
import os
import sys

from django.db.models.signals import post_syncdb
from django.db import connection, transaction, utils
import powerdb2.smap.models

EXTRA_SQL = ['sql/insert-stream.psql',
             'sql/set-metadata-default.psql']

@transaction.commit_manually
def install_extras(sender, **kwargs):
    """Install extra sql required by the archiver"""
    me = os.path.dirname(sys.modules[__name__].__file__)
    cursor = connection.cursor()
    for sqlfile in EXTRA_SQL:
        print "running", sqlfile
        with open(os.path.join(me, sqlfile), 'r') as fp:
            queries = fp.read()
            queries = queries.replace('%', '%%')

        try:
            cursor.execute(queries)
        except utils.DatabaseError, e:
            print "WARNING", e
            transaction.rollback()
        else:
            transaction.commit()

post_syncdb.connect(install_extras, sender=powerdb2.smap.models)
