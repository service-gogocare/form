/**
 * GOGOCARE 集氣平台 - 前端邏輯
 * 對應 spec.md 第 8 節 (前端流程)
 * 課程集氣 / 折扣門檻對應 docs/souce.md 「熱門課程降價集氣」
 */
(function () {
  var STATUS_POLL_INTERVAL_MS = 10000; // F05：每 10 秒重新取得最新資料
  var NAME_MAX_LENGTH = 50;
  var EMAIL_MAX_LENGTH = 100;

  // 折扣門檻需與 backend/Config.gs 的 CONFIG.DISCOUNT_TIERS 保持一致
  var DISCOUNT_TIERS = [
    { threshold: 100, label: '9折' },
    { threshold: 200, label: '8折' },
    { threshold: 300, label: '7折' },
    { threshold: 400, label: '6折' },
    { threshold: 500, label: '5折' },
  ];

  // ---------------------------------------------------------------------
  // 驗證規則（與後端 spec.md 第 6 節保持一致）
  // ---------------------------------------------------------------------
  function validateName(name) {
    if (!name || name.trim() === '') {
      return { valid: false, message: '請輸入姓名' };
    }
    if (name.trim().length > NAME_MAX_LENGTH) {
      return { valid: false, message: '姓名不可超過 ' + NAME_MAX_LENGTH + ' 字' };
    }
    return { valid: true };
  }

  function validateEmail(email) {
    if (!email || email.trim() === '') {
      return { valid: false, message: '請輸入 Email' };
    }
    var trimmed = email.trim();
    if (trimmed.length > EMAIL_MAX_LENGTH) {
      return { valid: false, message: 'Email 不可超過 ' + EMAIL_MAX_LENGTH + ' 字' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { valid: false, message: 'Email 格式錯誤' };
    }
    return { valid: true };
  }

  function formatNumber(num) {
    return Number(num).toLocaleString('zh-Hant');
  }

  // ---------------------------------------------------------------------
  // 折扣門檻計算（純函式，方便獨立測試；也作為 status API 未回傳時的備援）
  // ---------------------------------------------------------------------
  function getDiscountTierInfo(total) {
    var current = null;
    var next = null;
    for (var i = 0; i < DISCOUNT_TIERS.length; i++) {
      var tier = DISCOUNT_TIERS[i];
      if (total >= tier.threshold) {
        current = tier;
      } else {
        next = tier;
        break;
      }
    }
    return { current: current, next: next };
  }

  // 計算目前集氣人次在「上一階」到「下一階」之間的進度百分比 (0-100)
  function calcProgressPercent(total) {
    var info = getDiscountTierInfo(total);
    if (!info.next) return 100; // 已達最高折扣

    var prevThreshold = info.current ? info.current.threshold : 0;
    var span = info.next.threshold - prevThreshold;
    var progressed = total - prevThreshold;
    return Math.max(0, Math.min(100, Math.round((progressed / span) * 100)));
  }

  // ---------------------------------------------------------------------
  // DOM 邏輯（僅在瀏覽器環境執行，Node 測試環境會跳過）
  // ---------------------------------------------------------------------
  function initDom() {
    var eventPurpose = document.getElementById('eventPurpose');
    var eventPeriod = document.getElementById('eventPeriod');
    var coursesContainer = document.getElementById('coursesContainer');
    var updateTime = document.getElementById('updateTime');

    var dialog = document.getElementById('cheerDialog');
    var dialogCourseName = document.getElementById('dialogCourseName');
    var form = document.getElementById('cheerForm');
    var courseIdInput = document.getElementById('courseIdInput');
    var nameInput = document.getElementById('nameInput');
    var emailInput = document.getElementById('emailInput');
    var nameError = document.getElementById('nameError');
    var emailError = document.getElementById('emailError');
    var formMessage = document.getElementById('formMessage');
    var submitBtn = document.getElementById('submitBtn');
    var cancelBtn = document.getElementById('cancelBtn');

    var successOverlay = document.getElementById('successOverlay');
    var successCourseName = document.getElementById('successCourseName');
    var successTotal = document.getElementById('successTotal');
    var successDiscount = document.getElementById('successDiscount');
    var closeSuccessBtn = document.getElementById('closeSuccessBtn');

    var pollTimer = null;
    var latestCourses = [];

    function courseCardHtml(course) {
      var pct = calcProgressPercent(course.total);
      var discountText = course.currentDiscount
        ? '目前已解鎖 <strong>' + course.currentDiscount + '</strong>'
        : '尚未解鎖折扣';
      var nextText = course.nextTier
        ? '再 ' + formatNumber(course.nextTier.threshold - course.total) + ' 人次解鎖 ' + course.nextTier.label
        : '已達最高優惠！';

      var coverHtml = course.imageUrl
        ? '<a class="course-cover-link" href="' + course.url + '" target="_blank" rel="noopener noreferrer" aria-label="前往「' + course.name + '」課程頁面">' +
          '<img class="course-cover" src="' + course.imageUrl + '" alt="' + course.name + '" loading="lazy" onerror="this.closest(\'.course-cover-link\').style.display=\'none\'" />' +
          '</a>'
        : '';

      return (
        '<article class="course-card" data-course-id="' + course.id + '">' +
        coverHtml +
        '<span class="course-tag">' + course.category + '</span>' +
        '<h3 class="course-name">' + course.name + '</h3>' +
        '<div class="course-total">' + formatNumber(course.total) + ' <span>人次集氣</span></div>' +
        '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="course-discount">' + discountText + ' · ' + nextText + '</div>' +
        '<button type="button" class="cheer-btn course-cheer-btn" data-course-id="' + course.id + '" data-course-name="' + course.name + '">為這堂課集氣</button>' +
        '</article>'
      );
    }

    function renderCourses(courses) {
      latestCourses = courses;
      coursesContainer.innerHTML = courses.map(courseCardHtml).join('');

      var buttons = coursesContainer.querySelectorAll('.course-cheer-btn');
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          openDialog(btn.getAttribute('data-course-id'), btn.getAttribute('data-course-name'));
        });
      });
    }

    async function refreshStatus() {
      try {
        var data = await window.CheerAPI.fetchStatus();
        if (data && data.success) {
          if (data.eventPurpose && eventPurpose) eventPurpose.textContent = data.eventPurpose;
          if (data.eventPeriod && eventPeriod) eventPeriod.textContent = '活動期間：' + data.eventPeriod;
          renderCourses(data.courses || []);
          updateTime.textContent = '最後更新：' + data.updateTime;
        }
      } catch (err) {
        updateTime.textContent = '目前無法取得最新資料';
      }
    }

    function resetForm() {
      form.reset();
      nameError.textContent = '';
      emailError.textContent = '';
      formMessage.textContent = '';
    }

    function openDialog(courseId, courseName) {
      resetForm();
      courseIdInput.value = courseId;
      dialogCourseName.textContent = courseName;
      dialog.showModal();
    }

    function closeDialog() {
      dialog.close();
    }

    function showSuccess(result) {
      successCourseName.textContent = result.courseName;
      successTotal.textContent = formatNumber(result.total);
      successDiscount.textContent = result.currentDiscount
        ? '已解鎖 ' + result.currentDiscount
        : (result.nextTier
          ? '再 ' + formatNumber(result.nextTier.threshold - result.total) + ' 人次解鎖 ' + result.nextTier.label
          : '');
      successOverlay.classList.remove('hidden');
    }

    function hideSuccess() {
      successOverlay.classList.add('hidden');
    }

    async function handleSubmit(evt) {
      evt.preventDefault();

      var name = nameInput.value;
      var email = emailInput.value;
      var courseId = courseIdInput.value;

      var nameCheck = validateName(name);
      var emailCheck = validateEmail(email);
      nameError.textContent = nameCheck.valid ? '' : nameCheck.message;
      emailError.textContent = emailCheck.valid ? '' : emailCheck.message;
      formMessage.textContent = '';

      if (!nameCheck.valid || !emailCheck.valid) return;
      if (!courseId) {
        formMessage.textContent = '請選擇要集氣的課程';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '送出中...';

      try {
        var result = await window.CheerAPI.submitCheer(name.trim(), email.trim(), courseId);
        if (result.success) {
          closeDialog();
          showSuccess(result);
          refreshStatus();
        } else {
          formMessage.textContent = result.nextTime
            ? result.message + '，請於 ' + result.nextTime + ' 後再次集氣'
            : result.message;
        }
      } catch (err) {
        formMessage.textContent = '系統發生錯誤，請稍後再試';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '送出集氣';
      }
    }

    cancelBtn.addEventListener('click', closeDialog);
    form.addEventListener('submit', handleSubmit);
    closeSuccessBtn.addEventListener('click', hideSuccess);

    refreshStatus();
    pollTimer = setInterval(refreshStatus, STATUS_POLL_INTERVAL_MS);

    // 頁面隱藏時停止輪詢，回到前景再恢復，節省資源
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        clearInterval(pollTimer);
      } else {
        refreshStatus();
        pollTimer = setInterval(refreshStatus, STATUS_POLL_INTERVAL_MS);
      }
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initDom);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      validateName: validateName,
      validateEmail: validateEmail,
      formatNumber: formatNumber,
      getDiscountTierInfo: getDiscountTierInfo,
      calcProgressPercent: calcProgressPercent,
    };
  }
})();
