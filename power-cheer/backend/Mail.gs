/**
 * GOGOCARE 集氣平台 - 通知信件
 * spec.md 第 11 節列為未來擴充，這裡先提供基本寄信函式，
 * 由 Config.gs 的 MAIL_ENABLED 控制是否實際寄出。
 */
function sendConfirmationMail(name, email, course, total, tierInfo) {
  var subject = CONFIG.MAIL_SUBJECT;
  var courseName = course ? course.name : '';
  var discountLine = tierInfo && tierInfo.current
    ? '目前已為這堂課解鎖：' + tierInfo.current.label + '\n'
    : '';
  var nextLine = tierInfo && tierInfo.next
    ? '再集氣 ' + (tierInfo.next.threshold - total) + ' 人次即可解鎖 ' + tierInfo.next.label + '\n'
    : '';

  var body =
    name +
    ' 您好，\n\n' +
    '感謝您參與「' +
    CONFIG.EVENT_NAME +
    '」，為「' +
    courseName +
    '」集氣！\n' +
    '這堂課目前累積集氣人次：' +
    total +
    ' 人次。\n' +
    discountLine +
    nextLine +
    '\n' +
    CONFIG.EVENT_NAME +
    ' 敬上';

  MailApp.sendEmail(email, subject, body);
}
