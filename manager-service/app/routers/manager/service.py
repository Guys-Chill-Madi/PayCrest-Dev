from ...services.manager_service import (
    get_loans_for_manager,
    list_pending_signature_verifications,
    list_verification_team,
)
from ...services.loan_service import (
    assign_verification,
    manager_approve_or_reject,
    manager_forward_to_admin,
    manager_verify_signed_sanction,
    compute_customer_eligibility,
)
from ...services.admin_service import find_loan_any
from ...services.document_service import get_document_binary
