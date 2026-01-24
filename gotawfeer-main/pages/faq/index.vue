<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// SEO Configuration
const seo = useSeo()

// Set SEO for FAQ page
seo.setSeo({
  title: locale.value === 'ar' ? 'الأسئلة الشائعة' : 'FAQ',
  description: locale.value === 'ar' 
    ? 'إجابات على الأسئلة الشائعة حول متجر جو توفير. تعرف على سياسات الشحن، الإرجاع، والدفع.'
    : 'Answers to frequently asked questions about Go Tawfeer store. Learn about shipping, return, and payment policies.',
  keywords: locale.value === 'ar' 
    ? 'أسئلة شائعة، FAQ، مساعدة، جو توفير'
    : 'FAQ, frequently asked questions, help, Go Tawfeer',
  image: '/images/go-tawfeer-1-1.webp'
})
</script>
<template>
<main class="container container-faq my-5">
    <h2 class="mb-5 text-center ">الاسئلة الشائعة</h2>
    <div class="card shadow-sm mt-4">
        <div class="card-body">
            <div class="accordion d-flex flex-column " id="faqAccordion">


                <div class="accordion-item">
                <h2 class="accordion-header" id="headingOne">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne">
                هل المنتجات طبيعية وآمنة للاستخدام؟
                </button>
                </h2>
                <div id="collapseOne" class="accordion-collapse collapse" aria-labelledby="headingOne" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                نعم، جميع منتجاتنا مصنوعة من مكونات طبيعية بعناية لضمان سلامتها وفعاليتها. نحن ملتزمون بتقديم منتجات تلبي أعلى معايير الجودة.
                </div>
                </div>
                </div>


                <div class="accordion-item">
                <h2 class="accordion-header" id="headingTwo">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                هل يوجد شحن لجميع المناطق؟
                </button>
                </h2>
                <div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                نعم، نقدم خدمات الشحن لجميع المناطق داخل المملكة العربية السعودية مع ضمان توصيل سريع وآمن إلى باب منزلك.
                </div>
                </div>
                </div>


                <div class="accordion-item">
                <h2 class="accordion-header" id="headingThree">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                كيف يمكنني متابعة حالة طلبي؟
                </button>
                </h2>
                <div id="collapseThree" class="accordion-collapse collapse" aria-labelledby="headingThree" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                بعد إتمام طلبك، ستتلقى رسالة تأكيد تحتوي على رقم تتبع يمكنك استخدامه لمتابعة حالة شحنتك بسهولة.
                </div>
                </div>
                </div>


                <div class="accordion-item">
                <h2 class="accordion-header" id="headingFour">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFour" aria-expanded="false" aria-controls="collapseFour">
                هل توفرون عروض وخصومات؟
                </button>
                </h2>
                <div id="collapseFour" class="accordion-collapse collapse" aria-labelledby="headingFour" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                نعم، نقدم بشكل دوري عروض وخصومات مميزة على منتجاتنا. تأكد من متابعة متجرنا للحصول على أفضل العروض.
                </div>
                </div>
                </div>


            </div>
        </div>
    </div>
</main>
</template>