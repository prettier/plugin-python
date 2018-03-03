context = {
    **modeladmin.admin_site.each_context(request),
    'title': title,
    'objects_name': str(objects_name),
    'deletable_objects': [deletable_objects],
    'model_count': dict(model_count).items(),
    'queryset': queryset,
    'perms_lacking': perms_needed,
    'protected': protected,
    'opts': opts,
    'action_checkbox_name': helpers.ACTION_CHECKBOX_NAME,
    'media': modeladmin.media
}

dict(**{'x': 1}, y=2, **{'z': 3})

combination = {**first_dictionary, "x": 1, "y": 2}
