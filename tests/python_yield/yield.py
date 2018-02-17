def example(first):
    if False:
        yield

    yield first


def should_wrap():
    yield very_long_variable_name_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa


def should_unwrap():
    yield \
        short_variable_name
