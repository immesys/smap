"""
Copyright (c) 2011, 2012, Regents of the University of California
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions 
are met:

 - Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
 - Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the
   distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS 
FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL 
THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES 
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) 
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, 
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
OF THE POSSIBILITY OF SUCH DAMAGE.
"""

import time
import unittest

class ProfileHeader:
    def __init__(self):
        self.clocks = {}
        self.last = []

    def __str__(self):
        rv = ""
        for c in sorted(self.clocks.iterkeys()):
            s,e = self.clocks[c]
            if e != None:
                rv += "%s: %f\n" % (c, e - s)
            else:
                rv += "%s: running\n" % c
        return rv

    def header(self):
        self.stop()
        vals = map(lambda x: "%s=%f" % (x[0], x[1][1] - x[1][0]),
                   self.clocks.iteritems())
        return ','.join(vals)

    def start(self, clock1, *args):
        now = time.time()
        self.last = [clock1] + list(args)
        for c in self.last:
            self.clocks[c] = (now, None)

    def stop(self, *clocks):
        now = time.time()
        if len(clocks) == 0:
            clocks = self.clocks.iterkeys()
        for c in clocks:
            s,e = self.clocks[c]
            if e == None:
                self.clocks[c] = (s, now)

    def stop_last(self):
        self.stop(*self.last)
        self.last = []
            
class ProfileHeaderTests(unittest.TestCase):
    def test_start(self):
        p = ProfileHeader()
        p.start('foo','bar','baz')
        time.sleep(0.1)
        p.stop('bar')
        time.sleep(0.1)
        p.stop()

        p.start('all')
        p.start('none')
        p.stop_last()
        print p
        p.stop()
        print p.header()
        print p
    
if __name__ == '__main__':
    unittest.main()
