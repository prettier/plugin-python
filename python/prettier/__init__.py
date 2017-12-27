import os
import sys

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.path.insert(0, os.path.join(base_dir, 'vendor'))
sys.path.insert(0, os.path.join(base_dir, 'patched'))
