import asyncio

signal_queue = asyncio.Queue()

def get_signal_queue():
    return signal_queue
