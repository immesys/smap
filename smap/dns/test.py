
import dns.query
import dns.tsigkeyring
import dns.update
import sys

keys = dns.tsigkeyring.from_text({
    'smap-key.' : 'oP+157uQN7ewHC+TzMRU9zGphwvG8a/bJ40upmjmOac='
    })

update = dns.update.Update('smap', keyring=keys, keyname='smap-key.')
update.replace('me', 300, 'a', '127.0.0.1')

response = dns.query.tcp(update, '127.0.0.1')
