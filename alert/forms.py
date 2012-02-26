
from django.forms import ModelForm
from django.core.validators import validate_email

from powerdb2.alert.models import *

class RecipientsForm(ModelForm):
    class Meta:
        model = Recipients

    def clean_extra_users(self):
        # do a little clearning to make this less awkward
        vals = self.cleaned_data['extra_users'].split(',')
        vals = map(lambda x: x.strip(), vals)
        vals = filter(None, vals)

        # actually perform the validation -- raises a ValidationError
        # if any of the addresses are bad.
        map(validate_email, vals)
        return ','.join(vals)
