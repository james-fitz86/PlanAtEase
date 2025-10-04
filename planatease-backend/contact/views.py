from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import ContactMessageSerializer
from rest_framework.throttling import ScopedRateThrottle


# Create your views here.
class ContactMessageView(APIView):
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact"

    def post(self, request):
        ser = ContactMessageSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        subject = f"[Contact] {data['subject']}"
        
        text_body = render_to_string("emails/contact.txt", data)

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=settings.CONTACT_RECIPIENTS,
            reply_to=[data["email"]],
        )
        msg.send(fail_silently=False)

        return Response({"ok": True}, status=status.HTTP_202_ACCEPTED)
