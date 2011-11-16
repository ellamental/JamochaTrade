<?php $to = "jacktradespublic@gmail.com"; 
$subject = "Test PHP Mail"; 
$message = $_REQUEST['message'] ; 
$headers = "From: JamochaTrade"; 
$sent = mail($to, $subject, $message, $headers) ; 
if($sent) {print "Your mail was sent successfully"; } 
else {print "We encountered an error sending your mail"; } ?> 