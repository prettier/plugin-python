raise
raise ValueError
raise ValueError("error")

raise NotImplementedError('example.')

raise forms.ValidationError(
    self.error_messages['invalid_login'],
    code='invalid_login',
    params={
        'username': self.username_field.verbose_name
    }
)

raise SomeErrorWithAReallyReallyVeryVeryExtremelyExtensivelyLongNameSoItBreaks()
