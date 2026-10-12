from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from django.views.decorators.cache import never_cache
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('crm.urls')),
    path('', RedirectView.as_view(url='/login.html', permanent=False)),
    # development only: serve the HTML/CSS/JS files from /frontend
    re_path(r'^(?P<path>[\w.-]+\.(?:html|css|js))$', never_cache(serve), {'document_root': settings.FRONTEND_DIR}),
]
