
import sys
import socket
import traceback

import smtplib
from email.mime.text import MIMEText

sender = 'OpenBMS Alerter <alerts@mail.openbms.org>'

def send(to, subject, body, sender=sender):
    # if not has_email_sender: return False
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender
    email_sender = smtplib.SMTP('localhost')
    email_sender.sendmail(sender, to, msg.as_string())
    email_sender.quit()
