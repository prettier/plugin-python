def example(first):
    yield from first


def should_wrap():
    yield from very_long_variable_name_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa


def should_unwrap():
    yield from \
        short_variable_name
