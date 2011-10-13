
class InvalidStreamException(Exception):
    def __init__(self, message, arg):
        self.message = message
        self.arg = arg

    def __str__(self):
        return "InvalidStreamException: %s: [%s]" % (self.message, str(self.arg))
