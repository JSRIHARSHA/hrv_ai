import emailjs from '@emailjs/browser';
import { Order, OrderStatus } from '../types';
import { statusDisplayNames } from '../data/constants';

// EmailJS Configuration
// You need to replace these with your actual EmailJS credentials
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

// Email Templates
const EMAILJS_TEMPLATE_APPROVAL_REQUEST = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'YOUR_APPROVAL_REQUEST_TEMPLATE_ID';
const EMAILJS_TEMPLATE_APPROVAL_RESPONSE = process.env.REACT_APP_EMAILJS_PO_APPROVED || 'YOUR_APPROVAL_RESPONSE_TEMPLATE_ID'; // Same template for both approved and rejected

// Initialize EmailJS
export const initializeEmailJS = () => {
  if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    console.log('EmailJS initialized successfully');
    console.log('EmailJS Configuration:', {
      serviceId: EMAILJS_SERVICE_ID ? '✅ Set' : '❌ Not Set',
      publicKey: EMAILJS_PUBLIC_KEY ? '✅ Set' : '❌ Not Set',
      approvalRequestTemplate: EMAILJS_TEMPLATE_APPROVAL_REQUEST ? '✅ Set' : '❌ Not Set',
      approvalResponseTemplate: EMAILJS_TEMPLATE_APPROVAL_RESPONSE ? '✅ Set' : '❌ Not Set',
    });
  } else {
    console.warn('EmailJS not configured. Please set REACT_APP_EMAILJS_PUBLIC_KEY in .env file');
  }
};

/**
 * Send email notification when order status changes to "Sent PO for Approval"
 * Email is sent to the selected approver
 * Uses: APPROVAL REQUEST TEMPLATE (from REACT_APP_EMAILJS_TEMPLATE_ID)
 */
export const sendApprovalRequestEmail = async (order: Order, approverEmail: string): Promise<boolean> => {
  // Check if EmailJS is configured
  if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY' || 
      EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' || 
      !EMAILJS_TEMPLATE_APPROVAL_REQUEST || 
      EMAILJS_TEMPLATE_APPROVAL_REQUEST === 'YOUR_APPROVAL_REQUEST_TEMPLATE_ID') {
    console.warn('EmailJS Approval Request template not configured. Skipping email send.');
    return false;
  }

  try {
    // Prepare email data for APPROVAL REQUEST template
    const orderLink = `${window.location.origin}/order/${order.orderId}`;
    
    // Calculate supplier rate - use priceFromSupplier or materials supplierUnitPrice
    let supplierRate = '';
    if (order.materials && order.materials.length > 0) {
      // Get supplier rate from first material if available
      const firstMaterial = order.materials[0];
      if (firstMaterial.supplierUnitPrice) {
        supplierRate = `${firstMaterial.supplierUnitPrice.currency} ${firstMaterial.supplierUnitPrice.amount.toFixed(2)} per ${firstMaterial.quantity?.unit || order.quantity.unit}`;
      } else if (order.priceFromSupplier && order.priceFromSupplier.amount > 0) {
        supplierRate = `${order.priceFromSupplier.currency} ${order.priceFromSupplier.amount.toFixed(2)} per ${order.quantity.unit}`;
      }
    } else if (order.priceFromSupplier && order.priceFromSupplier.amount > 0) {
      supplierRate = `${order.priceFromSupplier.currency} ${order.priceFromSupplier.amount.toFixed(2)} per ${order.quantity.unit}`;
    }
    
    const templateParams = {
      // Email subject
      subject: `${order.orderId} - PO Requires Approval`,
      
      // Recipient information - Send to selected approver
      to_name: 'Approver',
      to_email: approverEmail,
      reply_to: approverEmail,
      customer_name: order.customer.name,
      
      // Order information
      order_id: order.orderId,
      po_number: order.poNumber || order.orderId,
      material_name: order.materialName,
      quantity: `${order.quantity.value} ${order.quantity.unit}`,
      supplier_rate: supplierRate || 'Not specified',
      
      // Status information
      status: statusDisplayNames['Sent_PO_for_Approval'],
      message: 'A new PO has been submitted for your approval. Please review and approve or reject.',
      
      // Additional details
      entity: order.entity || 'HRV',
      assigned_to: order.assignedTo.name,
      created_date: new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      
      // Order hyperlink
      order_link: orderLink,
      
      // Supplier information
      supplier_name: order.supplier?.name || 'Supplier',
      supplier_country: order.supplier?.country || '',
      
      // Call to action
      action_required: 'Please review and approve or reject this PO',
    };

    // Send email using APPROVAL REQUEST template
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_APPROVAL_REQUEST,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log(`✅ Approval request email sent successfully to ${approverEmail} (Template: Approval Request):`, response);
    return true;
  } catch (error) {
    console.error('Failed to send approval request email:', error);
    return false;
  }
};

/**
 * Send email notification when PO is approved
 * Email is sent to sriharshajvs@gmail.com, sivanagaraju.talari@hrvpharma.com, and vedansh.chandak@hrvpharma.com
 * Uses: APPROVAL RESPONSE TEMPLATE (same as rejected)
 */
export const sendPOApprovedEmail = async (order: Order): Promise<boolean> => {
  // Debug logging
  console.log('🔍 Sending PO Approved Email - Configuration Check:');
  console.log('  - EMAILJS_PUBLIC_KEY:', EMAILJS_PUBLIC_KEY ? '✅ Set' : '❌ Not Set');
  console.log('  - EMAILJS_SERVICE_ID:', EMAILJS_SERVICE_ID ? '✅ Set' : '❌ Not Set');
  console.log('  - EMAILJS_TEMPLATE_APPROVAL_RESPONSE:', EMAILJS_TEMPLATE_APPROVAL_RESPONSE);
  console.log('  - Raw env var REACT_APP_EMAILJS_PO_APPROVED:', process.env.REACT_APP_EMAILJS_PO_APPROVED);
  
  // Check if EmailJS is configured
  if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY' || 
      EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' || 
      !EMAILJS_TEMPLATE_APPROVAL_RESPONSE || 
      EMAILJS_TEMPLATE_APPROVAL_RESPONSE === 'YOUR_APPROVAL_RESPONSE_TEMPLATE_ID') {
    console.warn('❌ EmailJS Approval Response template not configured. Skipping email send.');
    console.warn('Please ensure REACT_APP_EMAILJS_PO_APPROVED is set in your .env file and restart the app.');
    return false;
  }

  try {
    // List of recipient emails
    const recipientEmails = [
      'sriharshajvs@gmail.com',
      'sivanagaraju.talari@hrvpharma.com',
      'vedansh.chandak@hrvpharma.com'
    ];
    
    // Send email to each recipient
    const sendPromises = recipientEmails.map(async (recipientEmail) => {
      const templateParams = {
        subject: `Approved - ${order.orderId}`,
        to_email: recipientEmail,
        order_id: order.orderId,
        action_type: 'APPROVED',
        message: `PO with Order ID ${order.orderId} has been approved.`
      };

      try {
        const response = await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_APPROVAL_RESPONSE,
          templateParams,
          EMAILJS_PUBLIC_KEY
        );
        console.log(`✅ PO Approved email sent successfully to ${recipientEmail}:`, response);
        return { email: recipientEmail, success: true };
      } catch (error) {
        console.error(`❌ Failed to send PO Approved email to ${recipientEmail}:`, error);
        return { email: recipientEmail, success: false, error };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`📧 PO Approved emails: ${successCount} succeeded, ${failedCount} failed`);
    
    // Return true if at least one email was sent successfully
    return successCount > 0;
  } catch (error) {
    console.error('Failed to send PO Approved emails:', error);
    return false;
  }
};

/**
 * Send email notification when PO is rejected
 * Email is sent to sriharshajvs@gmail.com, sivanagaraju.talari@hrvpharma.com, and vedansh.chandak@hrvpharma.com with rejection comments
 * Uses: APPROVAL RESPONSE TEMPLATE (same as approved)
 */
export const sendPORejectedEmail = async (order: Order, rejectionComments?: string): Promise<boolean> => {
  // Debug logging
  console.log('🔍 Sending PO Rejected Email - Configuration Check:');
  console.log('  - EMAILJS_PUBLIC_KEY:', EMAILJS_PUBLIC_KEY ? '✅ Set' : '❌ Not Set');
  console.log('  - EMAILJS_SERVICE_ID:', EMAILJS_SERVICE_ID ? '✅ Set' : '❌ Not Set');
  console.log('  - EMAILJS_TEMPLATE_APPROVAL_RESPONSE:', EMAILJS_TEMPLATE_APPROVAL_RESPONSE);
  console.log('  - Raw env var REACT_APP_EMAILJS_PO_APPROVED:', process.env.REACT_APP_EMAILJS_PO_APPROVED);
  console.log('  - Rejection Comments:', rejectionComments);
  
  // Check if EmailJS is configured
  if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY' || 
      EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' || 
      !EMAILJS_TEMPLATE_APPROVAL_RESPONSE || 
      EMAILJS_TEMPLATE_APPROVAL_RESPONSE === 'YOUR_APPROVAL_RESPONSE_TEMPLATE_ID') {
    console.warn('❌ EmailJS Approval Response template not configured. Skipping email send.');
    console.warn('Please ensure REACT_APP_EMAILJS_PO_APPROVED is set in your .env file and restart the app.');
    return false;
  }

  try {
    // List of recipient emails
    const recipientEmails = [
      'sriharshajvs@gmail.com',
      'sivanagaraju.talari@hrvpharma.com',
      'vedansh.chandak@hrvpharma.com'
    ];
    
    // Send email to each recipient
    const sendPromises = recipientEmails.map(async (recipientEmail) => {
      const templateParams = {
        subject: `Rejected - ${order.orderId}`,
        to_email: recipientEmail,
        order_id: order.orderId,
        action_type: 'REJECTED',
        message: `PO with Order ID ${order.orderId} has been rejected.`,
        rejection_comments: rejectionComments || 'No comments provided'
      };

      try {
        const response = await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_APPROVAL_RESPONSE,
          templateParams,
          EMAILJS_PUBLIC_KEY
        );
        console.log(`✅ PO Rejected email sent successfully to ${recipientEmail}:`, response);
        return { email: recipientEmail, success: true };
      } catch (error) {
        console.error(`❌ Failed to send PO Rejected email to ${recipientEmail}:`, error);
        return { email: recipientEmail, success: false, error };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`📧 PO Rejected emails: ${successCount} succeeded, ${failedCount} failed`);
    
    // Return true if at least one email was sent successfully
    return successCount > 0;
  } catch (error) {
    console.error('Failed to send PO Rejected emails:', error);
    return false;
  }
};

/**
 * Generic function to send email for any status change
 * Can be extended for other statuses in the future
 */
export const sendStatusChangeEmail = async (
  order: Order, 
  oldStatus: OrderStatus, 
  newStatus: OrderStatus,
  approverEmail?: string,
  additionalData?: { rejectionReason?: string }
): Promise<boolean> => {
  // Send email for "Sent PO for Approval" status
  if (newStatus === 'Sent_PO_for_Approval' && approverEmail) {
    return sendApprovalRequestEmail(order, approverEmail);
  }
  
  // Send email for "PO Approved" status
  if (newStatus === 'PO_Approved') {
    return sendPOApprovedEmail(order);
  }
  
  // Send email for "PO Rejected" status
  if (newStatus === 'PO_Rejected') {
    return sendPORejectedEmail(order, additionalData?.rejectionReason);
  }
  
  // Add more status-specific email logic here as needed
  
  return false;
};

