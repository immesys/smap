
import sys
import time

from django.contrib.auth.models import User
from powerdb.smap.models import *
from powerdb.smap.views import full_subscription_tree

if __name__ == '__main__':

    t = PlotTree.objects.get(id=5)
    t.data(time.time() - 3600, time.time())

#     print full_subscription_tree()
    sys.exit(1)
    #print subscription_tree(Subscription.objects.get(id=1))
# sys.exit(0)

    
    user = User.objects.get(username='root')
    t,c = Tree.objects.get_or_create(owner=user,
                                        public=True,
                                        name='TestTreeEdits')

    root,c = TreeItem.objects.get_or_create(typ='C', desc='SDH Tree')
    t.root = root
    t.save()

    print tree(None, 1)
#     for src in Subscription.objects.all():
#         node = TreeItem(typ='S', sub=src)
#         node.insert_at(root, position='last-child', save=True)

# print tree
#print tree(1)
    
