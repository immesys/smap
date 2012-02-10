
import sys
import socket

import smtplib
from email.mime.text import MIMEText
try:
    has_email_sender = False
    email_sender
    has_email_sender = True
except NameError:
    try:
        email_sender = smtplib.SMTP('mail.openbms.org')
    except socket.error:
        print >>sys.stderr, "WARNING: could not connect to smtp server; mail will not be sent"

sender = 'alerts@mail.openbms.org'

def send(to, subject, body, sender=sender):
    # if not has_email_sender: return False
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender
    print msg.as_string()
    if has_email_sender:
        email_sender.sendmaiel(sender, to, msg.as_string())
